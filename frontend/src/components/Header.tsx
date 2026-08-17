import { Anchor, Box, Container, Group, Text } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';

// Шапка §7.2: логотип «Calendar» слева, справа ссылки «Записаться» (/book)
// и «Админка» (/admin/bookings). Активный раздел выделен.
const NAV_ITEMS = [
  { to: '/book', label: 'Записаться', match: '/book' },
  { to: '/admin', label: 'Админка', match: '/admin' },
] as const;

export function Header() {
  const { pathname } = useLocation();

  return (
    <Box component="header" bg="white" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
      <Container size="lg">
        <Group h={56} justify="space-between">
          <Anchor component={Link} to="/" c="dark.9" underline="never">
            <Group gap={6} wrap="nowrap">
              {/* Логотип-календарь (скриншот 01-home.png) */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="3" stroke="#f06f04" strokeWidth="2" />
                <path d="M3 10h18" stroke="#f06f04" strokeWidth="2" />
                <path d="M8 3v4M16 3v4" stroke="#f06f04" strokeWidth="2" strokeLinecap="round" />
                <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#f06f04" />
                <rect x="11" y="13" width="3" height="3" rx="0.5" fill="#f06f04" />
              </svg>
              <Text fw={700} fz="lg" c="dark.9">
                Calendar
              </Text>
            </Group>
          </Anchor>
          <Group gap="lg">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.match);
              return (
                <Anchor
                  key={item.to}
                  component={Link}
                  to={item.to}
                  fz="sm"
                  fw={active ? 700 : 400}
                  c={active ? 'dark.9' : 'gray.7'}
                  underline={active ? 'always' : 'never'}
                >
                  {item.label}
                </Anchor>
              );
            })}
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
