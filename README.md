Project Boxes – macOS Distribution Guide
This fork of Project Boxes adds the configuration necessary to build a native macOS application that you can double‑click to open, just like Spotify or any other desktop app. The front‑end remains the same React + Tauri application from the original repository, but the bundling configuration and macOS entitlements have been adjusted to ensure outgoing network connections are permitted and a .app bundle with .dmg installer is generated on macOS.

Prerequisites
Before you build the macOS bundle you need to install the usual Tauri prerequisites:

Node 18+ and npm – for building the front‑end.

Rust toolchain – install via rustup. On macOS, ensure you also have the Xcode Command Line Tools installed (xcode‑select --install).

Tauri CLI – already listed as a dev‑dependency; run npm install to install it locally.

Docker Desktop (optional) – required only if you intend to run the micro‑services locally via npm run services:start.

Installing dependencies
Clone this repository and install the JavaScript dependencies:

bash
Copy
Edit
git clone https://github.com/andrepelegrini/boxes.git
cd boxes
# install dependencies defined in package.json
npm install
Running the micro‑services (optional)
Project Boxes is composed of a number of micro‑services (AI, OAuth, database, queue, Slack connector, socket server and WhatsApp connector). In development they can be started with:

arduino
Copy
Edit
npm run services:clean-start
When running the packaged macOS app you have two options:

Local services: run the services on your machine using Docker as above. The Tauri app will connect to them via localhost.

Remote services: change your .env.production variables and API endpoints to point at your hosted services, then rebuild the app. The entitlements and exception domain are configured to allow connections to any host.

Building and running the macOS app
The new tauri:build:mac script encapsulates the configuration required to produce a .app and .dmg on macOS. The script automatically targets the dmg bundle type so you don’t have to adjust Tauri’s CLI options yourself.

arduino
Copy
Edit
# make sure your services are running (if you use localhost)
npm run services:clean-start
# in another terminal, build the macOS application
npm run tauri:build:mac
After the build completes you’ll find the installer at:

swift
Copy
Edit
src-tauri/target/release/bundle/dmg/Project Boxes_0.1.0_x64.dmg
Open the .dmg, drag Project Boxes.app to your Applications folder and double‑click it to launch. Because the entitlements permit network client access, the application can communicate with Slack, Google’s Generative AI and any other internet services you configure.

Development mode
For quick iteration during development you can still run the application with hot‑reload using:

arduino
Copy
Edit
npm run tauri:dev
This launches Vite and the Tauri shell in tandem. The dev server listens on localhost:5173 and the Tauri window will reload when you make changes. Use this when you don’t need an installer but want to preview the app on macOS.

Notable changes in this fork
src-tauri/tauri.conf.json has been updated with a wildcard exceptionDomain to permit network requests to any host, just like a typical desktop application. Without this, macOS would silently block outgoing connections to domains other than localhost.

src-tauri/entitlements.plist has been corrected to include proper network client and server entitlements and to remove duplicate keys. This ensures the application can initiate and receive socket connections, which are required for the real‑time features of Project Boxes.

package.json defines a new tauri:build:mac script that wraps the Tauri CLI with the appropriate target for generating a .dmg installer.

Feel free to customise the application further—for example by updating the exceptionDomain in tauri.conf.json to restrict outbound access to a specific API host, or by changing the icons in src-tauri/icons to your own branding.