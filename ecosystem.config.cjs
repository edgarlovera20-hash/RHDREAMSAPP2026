module.exports = {
  apps: [
    {
      name: "rhdreams",
      script: "dist/server.cjs",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "512M",
      env_production: {
        NODE_ENV: "production",
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Graceful reload — wait for in-flight requests to finish
      wait_ready: true,
      shutdown_with_message: true,
    },
  ],
};
