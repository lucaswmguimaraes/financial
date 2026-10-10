// Copia o app antigo (index.html v2 da raiz) para /financial/legacy/ como plano B.
// Ele lê exatamente as mesmas chaves do localStorage, no mesmo endereço.
import { mkdirSync, copyFileSync } from 'node:fs'
mkdirSync('dist/legacy', { recursive: true })
copyFileSync('../index.html', 'dist/legacy/index.html')
console.log('legacy copiado para dist/legacy/')
