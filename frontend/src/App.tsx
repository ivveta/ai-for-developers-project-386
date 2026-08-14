import { MantineProvider } from '@mantine/core';
import { Outlet, Route, Routes } from 'react-router-dom';

import { Header } from './components/Header';
import { BookCatalog } from './pages/BookCatalog';
import { BookEventType } from './pages/BookEventType';
import { Home } from './pages/Home';

// Общий каркас: шапка §7.2 присутствует на всех экранах.
function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

export function App() {
  return (
    <MantineProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<BookCatalog />} />
          <Route path="/book/:eventTypeId" element={<BookEventType />} />
          {/* Остальные маршруты §7.1 добавляются по одному экрану */}
        </Route>
      </Routes>
    </MantineProvider>
  );
}
