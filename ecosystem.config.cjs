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
        PORT: "3000",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        GEMINI_FREE_API_KEY: process.env.GEMINI_FREE_API_KEY || "",
        GEMINI_PAID_API_KEY: process.env.GEMINI_PAID_API_KEY || "",
        GROQ_API_KEY: process.env.GROQ_API_KEY || "",
        MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || "",
        MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID || "",
        MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || "",
        MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || "",
        JWT_SECRET: process.env.JWT_SECRET || "",
        REDIS_URL: process.env.REDIS_URL || "",
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
