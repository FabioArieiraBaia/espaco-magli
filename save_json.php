<?php
$c = file_get_contents('https://balancaapi.avanutrionline.com/Relatorio/3d7ef969-3193-48e0-b214-eace697d740a');
file_put_contents('full_report.json', $c);
echo "Done";
