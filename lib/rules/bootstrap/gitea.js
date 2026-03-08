// Gitea Git-Server (Docker) + nginx + SSL

const DOCKER_COMPOSE_TEMPLATE = `version: "3"
services:
  gitea:
    image: gitea/gitea:latest
    container_name: gitea
    restart: always
    ports:
      - "127.0.0.1:3000:3000"
      - "222:22"
    volumes:
      - ./data:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
`

function generateGiteaNginxConfig(domain) {
  return `server {
    listen 80;
    server_name ${domain};

    client_max_body_size 100m;

    include /etc/nginx/snippets/security-headers.conf;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`
}

export default [
  {
    id: 'gitea-running',
    name: 'Gitea Container laeuft',
    category: 'bootstrap',
    order: 50,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd }) {
      const output = await runCmd("docker ps --filter name=gitea --format '{{.Status}}' 2>/dev/null")
      const running = output.includes('Up')
      return {
        passed: running,
        actual: running ? 'Container laeuft' : 'Container nicht gestartet',
        expected: 'Gitea Container Up',
      }
    },

    async enforce({ runCmd }) {
      // Verzeichnis + docker-compose.yml erstellen
      await runCmd('sudo mkdir -p /opt/gitea/data')
      const tmpPath = '/tmp/gitea-docker-compose.yml'
      const { writeFileSync } = await import('fs')
      writeFileSync(tmpPath, DOCKER_COMPOSE_TEMPLATE)
      await runCmd(`sudo mv ${tmpPath} /opt/gitea/docker-compose.yml`)

      // Container starten (mit -f statt cd, da sudo den CWD aendern kann)
      await runCmd('sudo docker compose -f /opt/gitea/docker-compose.yml up -d', { timeout: 120000 })
      // Warten bis Container Up ist
      await runCmd('sleep 5')
      return { changed: true }
    },
  },

  {
    id: 'gitea-localhost-binding',
    name: 'Gitea Port 3000 nur auf localhost',
    category: 'bootstrap',
    order: 50,
    scope: 'server',
    severity: 'critical',

    async audit({ runCmd }) {
      // docker-compose.yml pruefen ob Port auf 127.0.0.1 gebunden ist
      const compose = await runCmd('cat /opt/gitea/docker-compose.yml 2>/dev/null')
      if (!compose) return { passed: true, actual: 'docker-compose.yml nicht vorhanden', expected: '127.0.0.1:3000:3000' }
      const hasLocalhost = compose.includes('127.0.0.1:3000:3000')
      const hasOpen = compose.includes('"3000:3000"') || compose.includes("'3000:3000'")
      return {
        passed: hasLocalhost && !hasOpen,
        actual: hasLocalhost ? '127.0.0.1:3000' : (hasOpen ? '0.0.0.0:3000 (oeffentlich!)' : 'Port-Mapping unklar'),
        expected: '127.0.0.1:3000:3000',
      }
    },

    async enforce({ runCmd }) {
      // Port-Binding in docker-compose.yml auf 127.0.0.1 aendern
      await runCmd(`sudo sed -i 's/"3000:3000"/"127.0.0.1:3000:3000"/g' /opt/gitea/docker-compose.yml`)
      await runCmd(`sudo sed -i "s/'3000:3000'/'127.0.0.1:3000:3000'/g" /opt/gitea/docker-compose.yml`)
      // Container neu starten
      await runCmd('sudo docker compose -f /opt/gitea/docker-compose.yml up -d', { timeout: 60000 })
      await runCmd('sleep 3')
      return { changed: true }
    },
  },

  {
    id: 'gitea-nginx',
    name: 'Gitea nginx Config vorhanden',
    category: 'bootstrap',
    order: 51,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd, getConfig }) {
      const config = getConfig()
      const domain = config.gitDomain
      if (!domain) return { passed: false, actual: 'gitDomain nicht konfiguriert', expected: 'nginx Config vorhanden' }

      const exists = (await runCmd(`test -f /etc/nginx/sites-available/${domain} && echo yes || echo no`)).trim()
      return {
        passed: exists === 'yes',
        actual: exists === 'yes' ? 'Config vorhanden' : 'Config fehlt',
        expected: 'nginx Config vorhanden',
      }
    },

    async enforce({ runCmd, getConfig, writeNginxConfig }) {
      const config = getConfig()
      const domain = config.gitDomain
      if (!domain) throw new Error('gitDomain nicht in config.json gesetzt')

      const nginxConfig = generateGiteaNginxConfig(domain)
      await writeNginxConfig(domain, nginxConfig)
      // Symlink erstellen
      await runCmd(`sudo ln -sf /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/${domain}`)
      await runCmd('sudo nginx -t && sudo systemctl reload nginx')
      return { changed: true }
    },
  },

  {
    id: 'gitea-ssl',
    name: 'Gitea SSL-Zertifikat vorhanden',
    category: 'bootstrap',
    order: 52,
    scope: 'server',
    severity: 'high',

    async audit({ runCmd, getConfig }) {
      const config = getConfig()
      const domain = config.gitDomain
      if (!domain) return { passed: false, actual: 'gitDomain nicht konfiguriert', expected: 'SSL-Zertifikat vorhanden' }

      // nginx Config pruefen statt Dateisystem (deploy User kann /etc/letsencrypt/live/ nicht lesen)
      const nginxConf = await runCmd(`cat /etc/nginx/sites-available/${domain} 2>/dev/null`)
      const hasSSL = nginxConf.includes('ssl_certificate')
      return {
        passed: hasSSL,
        actual: hasSSL ? 'Zertifikat vorhanden' : 'Kein Zertifikat',
        expected: 'SSL-Zertifikat vorhanden',
      }
    },

    async enforce({ runCmd, getConfig, escapeShellArg }) {
      const config = getConfig()
      const domain = config.gitDomain
      if (!domain) throw new Error('gitDomain nicht in config.json gesetzt')

      // DNS pruefen vor SSL
      const ip = (await runCmd('curl -4 -s ifconfig.me')).trim()
      const dns = (await runCmd(`dig +short ${escapeShellArg(domain)}`)).trim()
      if (dns !== ip) {
        throw new Error(`DNS fuer ${domain} zeigt auf ${dns || 'nichts'}, erwartet ${ip}`)
      }

      await runCmd(`sudo certbot --nginx -d ${escapeShellArg(domain)} --non-interactive --agree-tos --register-unsafely-without-email`, { timeout: 60000 })
      return { changed: true }
    },
  },
]
