import { MantineProvider } from '@mantine/core';
import { Outlet, Route, Routes } from 'react-router-dom';

import { Header } from './components/Header';
import { Admin } from './pages/Admin';
import { AdminBookings } from './pages/AdminBookings';
import { AdminEventTypeNew } from './pages/AdminEventTypeNew';
import { AdminEventTypes } from './pages/AdminEventTypes';
import { BookCatalog } from './pages/BookCatalog';
import { BookEventType } from './pages/BookEventType';
import { BookSuccess } from './pages/BookSuccess';
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
          <Route path="/book/:eventTypeId/success" element={<BookSuccess />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/event-types" element={<AdminEventTypes />} />
          <Route path="/admin/event-types/new" element={<AdminEventTypeNew />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
        </Route>
      </Routes>
    </MantineProvider>
  );
}
