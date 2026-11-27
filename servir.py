# Servidor estático para jogar/testar sem cache do navegador (evita arquivos de js/ velhos misturados com novos).
# Uso: python servir.py [porta]   (padrão 8123) e abra http://localhost:8123/index.html
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class SemCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
print('Servindo em http://localhost:%d (sem cache)' % porta)
ThreadingHTTPServer(('', porta), SemCache).serve_forever()
