import { NavLink, Navigate, Route, Routes } from 'react-router';
import { TagsProvider } from './context/TagsContext';
import { CiphersPage } from './pages/CiphersPage/CiphersPage';
import { TagsPage } from './pages/TagsPage/TagsPage';

export function App() {
  return (
    <TagsProvider>
      <header className="topbar">
        <div className="topbar__inner">
          <span className="topbar__brand">Библиотека шифров</span>
          <nav className="topbar__nav" aria-label="Разделы">
            <NavLink to="/" end className="topbar__link">
              Шифры
            </NavLink>
            <NavLink to="/tags" className="topbar__link">
              Теги
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<CiphersPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </TagsProvider>
  );
}
