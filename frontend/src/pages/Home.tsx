import { Badge, Box, Button, Card, Container, Grid, List, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

// Главная страница `/` (§7.3, скриншот 01-home.png).
const FEATURES = [
  'Выбор типа события и удобного времени для встречи.',
  'Быстрое бронирование с подтверждением и дополнительными заметками.',
  'Управление типами встреч и просмотр предстоящих записей в админке.',
];

export function Home() {
  return (
    <Box
      style={{
        minHeight: 'calc(100vh - 57px)',
        background: 'linear-gradient(160deg, #e7edf7 0%, #eef2f9 45%, #f7f9fc 100%)',
      }}
    >
      <Container size="lg" py={64}>
        <Grid gutter={48} align="flex-start">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Badge variant="white" c="gray.7" size="lg" radius="xl" tt="uppercase" mb="md">
              Быстрая запись на звонок
            </Badge>
            <Title order={1} fz={56} c="dark.9" mb="md">
              Calendar
            </Title>
            <Text fz="lg" c="gray.7" maw={420} mb="xl">
              Забронируйте встречу за минуту: выберите тип события и удобное время.
            </Text>
            <Button
              component={Link}
              to="/book"
              size="md"
              radius="md"
              color="#f06f04"
              rightSection={<span aria-hidden>→</span>}
            >
              Записаться
            </Button>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder radius="lg" p="xl">
              <Title order={2} fz="xl" mb="md">
                Возможности
              </Title>
              <List c="gray.7" spacing="sm" icon={<Text span c="gray.7">•</Text>}>
                {FEATURES.map((feature) => (
                  <List.Item key={feature}>{feature}</List.Item>
                ))}
              </List>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}
