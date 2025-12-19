import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import './Navbar.css';

export const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="container flex-between">
                <Link to="/" className="navbar-logo">
                    anqer
                </Link>

                <div className="navbar-links">
                    <Link to="/app" className="nav-link">Log in</Link>
                    <Button variant="primary" size="sm" onClick={() => window.location.href = '/app'}>
                        Sign up
                    </Button>
                </div>
            </div>
        </nav>
    );
};
