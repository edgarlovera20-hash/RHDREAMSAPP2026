const DIGITALOCEAN_REFERRAL_URL =
  "https://www.digitalocean.com/?refcode=a86516358537&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge";

const DIGITALOCEAN_BADGE_IMAGE =
  "https://web-platforms.sfo2.cdn.digitaloceanspaces.com/WWW/Badge%202.svg";

type DigitalOceanBadgeProps = {
  className?: string;
};

export function DigitalOceanBadge({ className = "" }: DigitalOceanBadgeProps) {
  return (
    <a
      href={DIGITALOCEAN_REFERRAL_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="DigitalOcean Referral Badge"
      className={`inline-flex items-center justify-center rounded-lg border border-white/10 bg-slate-950/55 px-3 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.24)] transition-colors hover:border-cyan-300/40 hover:bg-cyan-400/5 ${className}`}
    >
      <img
        src={DIGITALOCEAN_BADGE_IMAGE}
        alt="DigitalOcean Referral Badge"
        className="h-8 w-auto"
        loading="lazy"
      />
    </a>
  );
}
