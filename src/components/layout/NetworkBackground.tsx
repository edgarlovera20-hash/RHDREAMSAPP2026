import { useEffect, useRef } from 'react';

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.7;
        this.vy = (Math.random() - 0.5) * 0.7;
        this.radius = Math.random() * 2.4 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(1, 238, 238, 0.38)';
        ctx.shadowColor = 'rgba(6, 170, 177, 0.40)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const initParticles = () => {
      particles = [];
      const numParticles = Math.floor((canvas.width * canvas.height) / 6500);
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
      }
    };

    const drawLines = () => {
      if (!ctx) return;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 155) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const opacity = (1 - distance / 155) * 0.30;
            ctx.strokeStyle = `rgba(1, 238, 238, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.shadowColor = 'rgba(6, 170, 177, 0.22)';
            ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      drawLines();

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, #0C1928 0%, #091623 55%, #07131F 100%)' }}>
      {/* Circuit grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(1,238,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(1,238,238,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      {/* Radial teal glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(0,113,188,0.22),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(6,170,177,0.14),transparent_32%),radial-gradient(circle_at_52%_90%,rgba(1,85,161,0.18),transparent_36%)]" />
      {/* Outer blue edge vignette — matches the blue outer frame */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,113,188,0.18)_0%,transparent_12%,transparent_88%,rgba(0,113,188,0.18)_100%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-30" />
    </div>
  );
}
