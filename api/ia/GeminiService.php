<?php

class GeminiService
{
    private $apiKey;
    private $apiUrl;

    public function __construct($apiKey, $model = 'gemini-2.5-flash-lite')
    {
        $this->apiKey = $apiKey;
        $this->apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";
    }

    public function generate($systemPrompt, $userPrompt, $history = [], $toolsConfig = null)
    {
        $contents = [];

        // 1. Histórico de Chat (Otimizado: Últimas 6 mensagens)
        if (!empty($history)) {
            $slidingWindow = array_slice($history, -8);
            foreach ($slidingWindow as $msg) {
                // Pular se a primeira mensagem for da IA (v1beta exige começar com User)
                if (empty($contents) && ($msg['role'] === 'ai' || $msg['role'] === 'model')) {
                    continue;
                }

                $role = ($msg['role'] === 'ai' || $msg['role'] === 'model') ? 'model' : 'user';
                $text = is_array($msg['text']) ? json_encode($msg['text']) : $msg['text'];
                $contents[] = [
                    "role" => $role,
                    "parts" => [["text" => $text]]
                ];
            }
        }

        // 2. Mensagem Atual do Usuário
        $contents[] = [
            "role" => "user",
            "parts" => [["text" => $userPrompt]]
        ];

        return $this->executeFlow($contents, $toolsConfig, 0, $systemPrompt);
    }

    private function executeFlow($contents, $toolsConfig = null, $depth = 0, $systemPrompt = "")
    {
        if ($depth > 5) {
            return "A IA tentou realizar muitas ações automáticas seguidas. Operação interrompida por segurança.";
        }

        $data = [
            "contents" => $contents,
            "system_instruction" => [
                "parts" => [["text" => $systemPrompt]]
            ],
            "generationConfig" => [
                "temperature" => 0.7,
                "topK" => 40,
                "topP" => 0.95,
                "maxOutputTokens" => 2048,
            ],
            "safetySettings" => [
                ["category" => "HARM_CATEGORY_HARASSMENT", "threshold" => "BLOCK_NONE"],
                ["category" => "HARM_CATEGORY_HATE_SPEECH", "threshold" => "BLOCK_NONE"],
                ["category" => "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold" => "BLOCK_NONE"],
                ["category" => "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold" => "BLOCK_NONE"]
            ]
        ];

        if ($toolsConfig && isset($toolsConfig['declarations']) && !empty($toolsConfig['declarations'])) {
            $data["tools"] = [
                [
                    "functionDeclarations" => $toolsConfig['declarations']
                ]
            ];
        }

        $result = $this->sendRequest($data);

        if (is_string($result)) {
            return $result; // Error message
        }

        // Verifica se é uma chamada de função (Tool Call)
        $toolResponses = [];
        $foundCall = false;

        if (isset($result['candidates'][0]['content']['parts'])) {
            // Usamos referência (&) para garantir que a normalização de 'args' seja persistida no histórico
            foreach ($result['candidates'][0]['content']['parts'] as &$part) {
                if (isset($part['functionCall'])) {
                    $foundCall = true;
                    $call = &$part['functionCall'];
                    $funcName = $call['name'];

                    // NORMALIZAÇÃO PARA PROTOCOLOS GOOGLE: 
                    // Se 'args' for um array vazio [], o json_encode enviará [], mas a Google exige um objeto {}.
                    if (!isset($call['args']) || empty($call['args'])) {
                        $call['args'] = (object) [];
                    }

                    if ($toolsConfig && isset($toolsConfig['callbacks'][$funcName])) {
                        // Executa callback dinâmico
                        $dadosDB = $toolsConfig['callbacks'][$funcName]($call['args']);

                        $toolResponses[] = [
                            "functionResponse" => [
                                "name" => $call['name'],
                                "response" => ["conteudo" => $dadosDB]
                            ]
                        ];
                    }
                }
            }
            unset($part); // Importante limpar a referência após o loop
        }

        if ($foundCall) {
            // Atualiza o histórico com a requisição NORMALIZADA da IA
            $contents[] = [
                "role" => "model",
                "parts" => $result['candidates'][0]['content']['parts']
            ];

            // Adiciona o turno de resposta do usuário com TODAS as execuções paralelas
            $contents[] = [
                "role" => "user",
                "parts" => $toolResponses
            ];

            // Faz a chamada recursiva permitindo continuar as ações
            $recursiveResult = $this->executeFlow($contents, $toolsConfig, $depth + 1, $systemPrompt);

            if ($depth === 0) {
                file_put_contents(__DIR__ . '/gemini_debug.log', "[" . date('Y-m-d H:i:s') . "] RECURSIVE RETURN: " . mb_strlen($recursiveResult) . " chars\n", FILE_APPEND);
            }

            return $recursiveResult;
        }

        $fullText = "";
        if (isset($result['candidates'][0]['content']['parts'])) {
            foreach ($result['candidates'][0]['content']['parts'] as $part) {
                if (isset($part['text'])) {
                    $fullText .= $part['text'];
                }
            }
        }

        // Log final turn
        file_put_contents(__DIR__ . '/gemini_debug.log', "[" . date('Y-m-d H:i:s') . "] TURN DEPTH $depth GENERATED: " . mb_strlen($fullText) . " chars\n", FILE_APPEND);

        return $fullText ?: "A IA não retornou resposta. Tente encurtar sua pergunta.";
    }

    private function sendRequest($data)
    {
        $maxRetries = 3;
        $retryCount = 0;
        $response = "";
        $httpCode = 0;
        $error = "";

        $logFile = __DIR__ . '/gemini_debug.log';
        file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] OUTGOING REQUEST:\n" . json_encode($data, JSON_PRETTY_PRINT) . "\n", FILE_APPEND);

        while ($retryCount < $maxRetries) {
            $ch = curl_init($this->apiUrl . "?key=" . $this->apiKey);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] RESPONSE CODE: $httpCode\n" . substr($response, 0, 1000) . "\n", FILE_APPEND);

            if ($httpCode === 429 || $httpCode === 503) {
                $retryCount++;
                if ($retryCount < $maxRetries) {
                    sleep(3);
                    continue;
                }
            }
            break;
        }

        if ($httpCode !== 200) {
            $errData = json_decode($response, true);
            $msg = $errData['error']['message'] ?? $error ?? "Erro desconhecido";

            if ($httpCode === 429 || $httpCode === 503) {
                return "LIMITE ATINGIDO (" . $httpCode . "): " . $msg . " (Por favor, aguarde e tente novamente)";
            }

            if ($httpCode === 400) {
                return "ERRO DE VOLUME: " . $msg;
            }

            return "ERRO NA IA: " . $msg;
        }

        return json_decode($response, true);
    }
}
