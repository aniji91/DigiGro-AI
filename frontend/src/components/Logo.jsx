import { Link } from 'react-router-dom';
import './Logo.css';

export default function Logo({ className = '', size = 'md', linkTo = '/' }) {
  const img = (
    <img
      src="/digigro-logo.png"
      alt="DigiGro AI"
      className={`digigro-logo digigro-logo--${size} ${className}`.trim()}
    />
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="digigro-logo-link">
        {img}
      </Link>
    );
  }

  return img;
}
