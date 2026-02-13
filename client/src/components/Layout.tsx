import { Outlet, NavLink } from 'react-router-dom';
import { Image, LayoutGrid, Sparkles } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-gallery-950/80 backdrop-blur-xl p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-gold to-accent-copper flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-gallery-950" />
          </div>
          <div>
            <h1 className="font-display text-lg text-gallery-100">Galleria</h1>
            <p className="text-xs text-gallery-500 -mt-1">Studio</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { to: '/studio', icon: Image, label: 'Create Mockup' },
            { to: '/gallery', icon: LayoutGrid, label: 'My Gallery' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-accent-gold font-medium'
                    : 'text-gallery-400 hover:text-gallery-200 hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="glass-panel p-4 text-center">
          <p className="text-xs text-gallery-400">Galleria Studio v2.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}