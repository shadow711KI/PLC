// PM2 configuration for Windows service
module.exports = {
  apps: [
    {
      name: 'motor-backend',
      script: 'server/index.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'motor-frontend',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 3000',
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}
