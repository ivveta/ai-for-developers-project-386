import { Avatar, Group, Stack, Text } from '@mantine/core';

// Владелец календаря — константа фронта (STRUCTURE-PLAN, решение 6): Tota / Host.
// Блок «аватар + имя + подпись» повторяется в каталоге (§7.4) и в колонке
// типа события на странице выбора слота (§7.5).
export function HostAvatar() {
  return (
    <Group gap="sm" wrap="nowrap">
      <Avatar size={56} radius="xl" color="gray.1">
        <span aria-hidden>🐤</span>
      </Avatar>
      <Stack gap={0}>
        <Text fw={700}>Tota</Text>
        <Text fz="sm" c="gray.6">
          Host
        </Text>
      </Stack>
    </Group>
  );
}
