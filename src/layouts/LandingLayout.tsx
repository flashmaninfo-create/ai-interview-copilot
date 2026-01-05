import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export function LandingLayout() {
    return (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
             {/* Navbar needs to be adapted for light mode or translucent */}
            <Navbar variant="light" /> 
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer variant="dark" />

        </div>
    );
}

