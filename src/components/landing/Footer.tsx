
import { Link } from 'react-router-dom';

const SocialIcon = ({ path }: { path: string }) => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d={path} clipRule="evenodd" />
    </svg>
);

const Icons = {
    Facebook: 'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z',
    LinkedIn: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z',
    X: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    YouTube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    Instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
    TikTok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.16c0 2.52-1.12 4.84-2.9 6.24-1.72 1.35-4.03 1.96-6.19 1.44-1.84-.45-3.41-1.64-4.36-3.27-.95-1.61-1.12-3.6-.52-5.32S4.5 10.3 6.09 9.53c1.55-.78 3.39-.68 4.9.22v4.2c-1.68-1.55-4.52-1.07-5.63 1.05-.2.4-.29.85-.26 1.3 0 .1.03.2.06.3.31 1.25 1.33 2.18 2.62 2.27 1.29.11 2.53-.78 2.87-2.03.04-.15.06-.3.06-.46V.02l1.81.01z',
    Discord: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.772-.6083 1.1588a18.2915 18.2915 0 00-5.4882 0 12.649 12.649 0 00-.6173-1.1588.0776.0776 0 00-.0785-.0371 19.7363 19.7363 0 00-4.8852 1.5151.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z',
};

export function Footer() {
    return (
        <footer className="bg-primary text-white pt-20 pb-12 border-t border-primary/20">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-sm">
                    {/* Brand Column */}
                    <div>
                        <div className="text-3xl font-extrabold text-white mb-2">Smart AI<br />Assistant<span className="text-xs align-top ml-1">TM</span></div>
                        <p className="text-white/60 mb-6">&copy; {new Date().getFullYear()} Smart AI Assistant™ - All rights reserved.</p>

                        <div>
                            <p className="font-bold text-white mb-1">Proudly based in</p>
                            <div className="flex items-center gap-2 text-white/80">
                                Seattle, Washington, USA <span className="text-lg">🇺🇸</span>
                            </div>
                        </div>
                    </div>

                    {/* Links Column */}
                    <div>
                        <h4 className="font-bold text-white mb-6 text-lg">Links</h4>
                        <div className="flex flex-col gap-4">
                            <Link to="#" className="hover:text-white/80 transition-opacity opacity-90">Chrome Store</Link>
                            <Link to="#" className="hover:text-white/80 transition-opacity opacity-90">Try Demo</Link>
                            <Link to="#" className="hover:text-white/80 transition-opacity opacity-90">Privacy Policy</Link>
                            <Link to="#" className="hover:text-white/80 transition-opacity opacity-90">Terms of Service</Link>
                            <Link to="#" className="hover:text-white/80 transition-opacity opacity-90">About Us</Link>
                            <Link to="#" className="hover:text-white/80 transition-opacity opacity-90">Blog</Link>
                        </div>
                    </div>

                    {/* Follow Us Column */}
                    <div>
                        <h4 className="font-bold text-white mb-6 text-lg">Follow Us</h4>
                        <div className="flex flex-col gap-4">
                            <a href="#" className="flex items-center gap-3 hover:text-white/80 transition-opacity opacity-90"><SocialIcon path={Icons.Facebook} /> Facebook</a>
                            <a href="#" className="flex items-center gap-3 hover:text-white/80 transition-opacity opacity-90"><SocialIcon path={Icons.LinkedIn} /> LinkedIn</a>
                            <a href="#" className="flex items-center gap-3 hover:text-white/80 transition-opacity opacity-90"><SocialIcon path={Icons.X} /> X</a>
                            <a href="#" className="flex items-center gap-3 hover:text-white/80 transition-opacity opacity-90"><SocialIcon path={Icons.YouTube} /> YouTube</a>
                            <a href="#" className="flex items-center gap-3 hover:text-white/80 transition-opacity opacity-90"><SocialIcon path={Icons.Instagram} /> Instagram</a>
                            <a href="#" className="flex items-center gap-3 hover:text-white/80 transition-opacity opacity-90"><SocialIcon path={Icons.TikTok} /> TikTok</a>
                            <a href="#" className="flex items-center gap-3 hover:text-white/80 transition-opacity opacity-90"><SocialIcon path={Icons.Discord} /> Discord</a>
                        </div>
                    </div>

                    {/* Support & Account Column */}
                    <div className="space-y-10">
                        <div>
                            <h4 className="font-bold text-white mb-6 text-lg">Support</h4>
                            <div className="flex flex-col gap-4">
                                <Link to="#" className="hover:text-white/80 transition-opacity opacity-90">Support Desk</Link>
                                <Link to="#" className="hover:text-white/80 transition-opacity opacity-90">Contact Us</Link>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6 text-lg">Account</h4>
                            <div className="flex flex-col gap-4">
                                <Link to="/dashboard" className="hover:text-white/80 transition-opacity opacity-90">Dashboard</Link>
                                <Link to="/dashboard/console" className="hover:text-white/80 transition-opacity opacity-90">Console</Link>
                                <Link to="/logout" className="hover:text-white/80 transition-opacity opacity-90">Log Out</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
