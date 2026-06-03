import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Main.css';

export default function Main() {
  const [startHovered, setStartHovered] = useState(false);

  return (
    <main className={`main${startHovered ? ' main--start-hovered' : ''}`}>
      <div className="main-white" aria-hidden="true" />
      <div className="main-fill" aria-hidden="true" />
      <div className="main-left">
        <Link
          to="/login"
          className="main-start"
          onMouseEnter={() => setStartHovered(true)}
          onMouseLeave={() => setStartHovered(false)}
          onFocus={() => setStartHovered(true)}
          onBlur={() => setStartHovered(false)}
        >
          start
        </Link>
      </div>
      <div className="main-right">
        <h1 className="main-headline">
          <span>new</span>
          <span>era of</span>
          <span>journ</span>
          <span>alling</span>
        </h1>
      </div>
    </main>
  );
}
