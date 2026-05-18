import {
  Table,
  Button,
  Heading,
  HStack,
  IconButton,
  Stack,
  Text,
  Box,
  Flex,
  Spinner,
  Center,
  Input,
} from '@chakra-ui/react';
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from 'react-icons/lu';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { lockersService } from '../services/lockers';
import { membersService } from '../services/members';
import { Toaster, toaster } from '../components/ui/toaster';
import type { LockerDTO, LockerStatus, MemberDTO, UpdateLockerRequest } from '@alentapp/shared';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from '../components/ui/dialog';
import { Field } from '../components/ui/field';
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  createListCollection,
} from '../components/ui/select';

const statusCollection = createListCollection({
  items: [
    { label: 'Available', value: 'Available' },
    { label: 'Occupied', value: 'Occupied' },
    { label: 'Maintenance', value: 'Maintenance' },
  ],
});

const emptyForm = {
  number: '',
  location: '',
  status: 'Available' as LockerStatus,
  member_id: 'none',
};

const statusLabels: Record<LockerStatus, string> = {
  Available: 'Disponible',
  Occupied: 'Ocupado',
  Maintenance: 'Mantenimiento',
};

const statusColors: Record<LockerStatus, { bg: string; color: string }> = {
  Available: { bg: 'green.50', color: 'green.700' },
  Occupied: { bg: 'orange.50', color: 'orange.700' },
  Maintenance: { bg: 'red.50', color: 'red.700' },
};

export function LockersView() {
  const [lockers, setLockers] = useState<LockerDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLockerId, setEditingLockerId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const membersCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: 'Sin socio asignado', value: 'none' },
          ...members.map((member) => ({ label: `${member.name} - DNI ${member.dni}`, value: member.id })),
        ],
      }),
    [members],
  );

  const fetchLockers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await lockersService.getAll();
      setLockers(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los lockers');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await membersService.getAll();
      setMembers(data);
    } catch (_err) {
      setMembers([]);
    }
  };

  const openCreateModal = () => {
    setEditingLockerId(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditModal = (locker: LockerDTO) => {
    setEditingLockerId(locker.id);
    setFormData({
      number: String(locker.number),
      location: locker.location,
      status: locker.status,
      member_id: locker.member_id ?? 'none',
    });
    setIsDialogOpen(true);
  };

  const handleStatusChange = (status: LockerStatus) => {
    setFormData({
      ...formData,
      status,
      member_id: status === 'Maintenance' ? 'none' : formData.member_id,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingLockerId) {
        const payload: UpdateLockerRequest = {
          number: Number(formData.number),
          location: formData.location,
          status: formData.status,
          member_id: formData.member_id === 'none' ? null : formData.member_id,
        };
        const updatedLocker = await lockersService.update(editingLockerId, payload);

        toaster.create({
          title: 'Locker actualizado',
          description: `Locker N° ${updatedLocker.number} actualizado correctamente.`,
          type: 'success',
        });
      } else {
        const createdLocker = await lockersService.create({
          number: Number(formData.number),
          location: formData.location,
        });

        toaster.create({
          title: 'Locker creado',
          description: `Locker N° ${createdLocker.number} creado en estado ${createdLocker.status}.`,
          type: 'success',
        });
      }

      setIsDialogOpen(false);
      fetchLockers();
    } catch (err: any) {
      toaster.create({
        title: 'Error',
        description: err.message || 'Error al guardar el locker',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocker = async (id: string, number: number) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el locker N° ${number}? Esta acción no se puede deshacer.`)) {
      try {
        await lockersService.delete(id);
        toaster.create({
          title: 'Locker eliminado',
          description: `El locker N° ${number} se eliminó correctamente.`,
          type: 'success',
        });
        fetchLockers();
      } catch (err: any) {
        toaster.create({
          title: 'Error',
          description: err.message || 'Error al eliminar el locker',
          type: 'error',
        });
      }
    }
  };

  useEffect(() => {
    fetchLockers();
    fetchMembers();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Toaster />
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Lockers</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona los lockers del club, su ubicación, estado y socio asignado.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchLockers} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Locker
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingLockerId ? 'Editar Locker' : 'Agregar Nuevo Locker'}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Número" required>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ej. 101"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Ubicación" required>
                  <Input
                    placeholder="Ej. Vestuario principal"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </Field>

                {editingLockerId && (
                  <>
                    <Field label="Estado" required>
                      <SelectRoot
                        collection={statusCollection}
                        value={[formData.status]}
                        onValueChange={(e) => handleStatusChange(e.value[0] as LockerStatus)}
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusCollection.items.map((item) => (
                            <SelectItem item={item} key={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Field>

                    <Field label="Socio asignado">
                      <SelectRoot
                        collection={membersCollection}
                        value={[formData.member_id]}
                        onValueChange={(e) => setFormData({ ...formData, member_id: e.value[0] })}
                        disabled={formData.status === 'Maintenance'}
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione un socio" />
                        </SelectTrigger>
                        <SelectContent>
                          {membersCollection.items.map((item) => (
                            <SelectItem item={item} key={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                      {formData.status === 'Maintenance' && (
                        <Text mt="2" color="fg.muted" fontSize="sm">
                          No se puede asignar un socio a un locker en mantenimiento.
                        </Text>
                      )}
                    </Field>
                  </>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingLockerId ? 'Guardar Cambios' : 'Crear Locker'}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box bg="bg.panel" borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden" minH="300px" position="relative">
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando lockers...</Text>
              </Stack>
            </Center>
          ) : lockers.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron lockers.</Text>
                <Button variant="ghost" onClick={fetchLockers}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Número</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Ubicación</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio asignado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {lockers.map((locker) => {
                  const statusStyle = statusColors[locker.status];
                  return (
                    <Table.Row key={locker.id} _hover={{ bg: 'bg.muted/30' }}>
                      <Table.Cell fontWeight="semibold" color="fg.emphasized">#{locker.number}</Table.Cell>
                      <Table.Cell color="fg.muted">{locker.location}</Table.Cell>
                      <Table.Cell>
                        <Box
                          display="inline-block"
                          px="2"
                          py="0.5"
                          borderRadius="md"
                          bg={statusStyle.bg}
                          color={statusStyle.color}
                          fontSize="xs"
                          fontWeight="bold"
                        >
                          {statusLabels[locker.status]}
                        </Box>
                      </Table.Cell>
                      <Table.Cell color="fg.muted">{locker.member_name || 'Sin asignar'}</Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack gap="2" justify="flex-end">
                          <IconButton variant="ghost" size="sm" aria-label="Editar locker" onClick={() => openEditModal(locker)}>
                            <LuPencil />
                          </IconButton>
                          <IconButton variant="ghost" size="sm" colorPalette="red" aria-label="Eliminar locker" onClick={() => handleDeleteLocker(locker.id, locker.number)}>
                            <LuTrash2 />
                          </IconButton>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}
