
## 📦 Instalação de dependências

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/andrepelegrini/boxes.git
cd boxes
npm install
```

## ⚙️ Executando micro-serviços (opcional)

O Project Boxes usa vários micro-serviços (AI, OAuth, database, queue, Slack connector, socket server, WhatsApp connector).
No desenvolvimento, eles podem ser iniciados com:

```bash
npm run services:clean-start
```

No app empacotado, você pode:

* **Usar serviços locais:** mantenha os serviços rodando no seu Mac (o app vai se conectar via `localhost`).
* **Usar serviços remotos:** edite `.env.production` e aponte para seus endpoints hospedados.

## 🛠️ Build e execução no macOS

O script `tauri:build:mac` gera o `.app` e o `.dmg`:

```bash
# se for usar serviços locais, suba-os antes
npm run services:clean-start

# em outro terminal, construa o app
npm run tauri:build:mac
```

O instalador ficará em:

```
src-tauri/target/release/bundle/dmg/Project Boxes_0.1.0_x64.dmg
```

Abra o `.dmg`, arraste **Project Boxes.app** para a pasta **Applications** e dê duplo-clique para abrir.
Os entitlements permitem acesso total à rede, então o app pode se comunicar com Slack, IA e outros serviços externos.

## 🚀 Modo desenvolvimento

Para desenvolvimento rápido com hot-reload:

```bash
npm run tauri:dev
```

Isso abre o app em uma janela Tauri carregando o front-end do Vite (`localhost:5173`), recarregando automaticamente a cada alteração.

## 🔍 Alterações principais desta versão

* `src-tauri/tauri.conf.json` – `exceptionDomain` configurado como `"*"` para permitir conexões a qualquer domínio.
* `src-tauri/entitlements.plist` – entitlements corrigidos para conexões de rede (cliente e servidor) e acesso a arquivos.
* `package.json` – adicionado script `tauri:build:mac` para gerar `.dmg` diretamente.

---