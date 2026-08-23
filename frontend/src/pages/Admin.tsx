import { Box, Card, Container, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

const ADMIN_LINKS = [
  {
    to: '/admin/bookings',
    title: 'Предстоящие встречи',
    description: 'Просмотреть список записанных встреч',
  },
  {
    to: '/admin/event-types/new',
    title: 'Новый тип события',
    description: 'Создать новый тип события для записи',
  },
] as const;

// Админ-панель `/admin`: хаб с переходами на основные разделы.
export function Admin() {
  return (
    <Box bg="gray.0" style={{ minHeight: 'calc(100vh - 57px)' }}>
      <Container size="lg" py={40}>
        <Title order={1} fz={28} mb="xl">
          Админ-панель
        </Title>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {ADMIN_LINKS.map((link) => (
            <Card
              key={link.to}
              component={Link}
              to={link.to}
              withBorder
              radius="lg"
              p="xl"
              style={{ textDecoration: 'none', transition: 'border-color 150ms ease' }}
            >
              <Group align="flex-start">
                <div>
                  <Text fw={600} fz="lg" c="dark.9">
                    {link.title}
                  </Text>
                  <Text fz="sm" c="gray.6" mt={4}>
                    {link.description}
                  </Text>
                </div>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
