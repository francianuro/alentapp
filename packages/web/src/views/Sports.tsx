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
    Textarea,
} from '@chakra-ui/react';
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from 'react-icons/lu';
import { useEffect, useState } from 'react';
import { sportsService } from '../services/sports';
import { Toaster, toaster } from '../components/ui/toaster';
import type {
    //CreateSportRequest,
    SportResponse,
    UpdateSportRequest,
} from '@alentapp/shared';
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

const emptyForm = {
    name: '',
    description: '',
    max_capacity: 1,
    additional_price: '',
    requires_medical_certificate: false,
};

export function SportsView() {
    const [sports, setSports] = useState<SportResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSportId, setEditingSportId] = useState<string | null>(null);
    const [formData, setFormData] = useState(emptyForm);

    const fetchSports = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await sportsService.getAll();
            setSports(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los deportes');
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingSportId(null);
        setFormData(emptyForm);
        setIsDialogOpen(true);
    };

    const openEditModal = (sport: SportResponse) => {
        setEditingSportId(sport.id);
        setFormData({
            name: sport.name,
            description: sport.description,
            max_capacity: sport.max_capacity,
            additional_price: String(sport.additional_price),
            requires_medical_certificate: sport.requires_medical_certificate,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            description: formData.description,
            max_capacity: Number(formData.max_capacity),
            additional_price: Number(formData.additional_price || 0),
            requires_medical_certificate: formData.requires_medical_certificate,
        };

        try {
            if (editingSportId) {
                await sportsService.update(
                    editingSportId,
                    payload as UpdateSportRequest,
                );

                toaster.create({
                    title: 'Deporte actualizado',
                    description: 'El deporte se actualizó correctamente.',
                    type: 'success',
                });
            } else {
                await sportsService.create({
                    name: formData.name,
                    ...payload,
                });

                toaster.create({
                    title: 'Deporte creado',
                    description: 'El deporte se creó correctamente.',
                    type: 'success',
                });
            }

            setIsDialogOpen(false);
            fetchSports();
        } catch (err: any) {
            toaster.create({
                title: 'Error',
                description: err.message || 'Error al guardar el deporte',
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSport = async (id: string, name: string) => {
        if (
            window.confirm(
                `¿Estás seguro de que deseas eliminar el deporte "${name}"? Esta acción no se puede deshacer.`,
            )
        ) {
            try {
                await sportsService.delete(id);
                fetchSports();
            } catch (err: any) {
                alert(err.message || 'Error al eliminar el deporte');
            }
        }
    };

    useEffect(() => {
        fetchSports();
    }, []);

    return (
        <DialogRoot
            open={isDialogOpen}
            onOpenChange={(e) => setIsDialogOpen(e.open)}
        >
            <Toaster />
            <Stack gap="8">
                <Flex justify="space-between" align="center">
                    <Stack gap="1">
                        <Heading size="2xl" fontWeight="bold">
                            Administración de Deportes
                        </Heading>
                        <Text color="fg.muted" fontSize="md">
                            Gestiona la oferta deportiva, cupos, precios y
                            requisitos médicos del club.
                        </Text>
                    </Stack>
                    <HStack gap="3">
                        <Button
                            variant="outline"
                            onClick={fetchSports}
                            disabled={isLoading}
                        >
                            <LuRefreshCw /> Actualizar
                        </Button>
                        <Button
                            colorPalette="blue"
                            size="md"
                            onClick={openCreateModal}
                        >
                            <LuPlus /> Agregar Deporte
                        </Button>
                    </HStack>
                </Flex>

                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>
                                {editingSportId
                                    ? 'Editar Deporte'
                                    : 'Agregar Nuevo Deporte'}
                            </DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            <Stack gap="4">
                                <Field label="Nombre" required>
                                    <Input
                                        placeholder="Ej. Fútbol"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                name: e.target.value,
                                            })
                                        }
                                        disabled={Boolean(editingSportId)}
                                        required
                                    />
                                </Field>
                                <Field label="Descripción" required>
                                    <Textarea
                                        placeholder="Ej. Entrenamiento recreativo y competitivo"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                description: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Cupo máximo" required>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.max_capacity}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                max_capacity: Number(
                                                    e.target.value,
                                                ),
                                            })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Precio adicional" required>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.additional_price}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                additional_price:
                                                    e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Certificado médico">
                                    <label>
                                        <input
                                            aria-label="Requiere certificado médico"
                                            type="checkbox"
                                            checked={
                                                formData.requires_medical_certificate
                                            }
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    requires_medical_certificate:
                                                        e.target.checked,
                                                })
                                            }
                                        />{' '}
                                        Requiere certificado médico
                                    </label>
                                </Field>
                            </Stack>
                        </DialogBody>
                        <DialogFooter>
                            <DialogActionTrigger asChild>
                                <Button variant="outline">Cancelar</Button>
                            </DialogActionTrigger>
                            <Button
                                type="submit"
                                colorPalette="blue"
                                loading={isSubmitting}
                            >
                                {editingSportId
                                    ? 'Guardar Cambios'
                                    : 'Crear Deporte'}
                            </Button>
                        </DialogFooter>
                        <DialogCloseTrigger />
                    </form>
                </DialogContent>

                {error && (
                    <Box
                        p="4"
                        bg="red.50"
                        color="red.700"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="red.200"
                    >
                        <Text fontWeight="bold">Error:</Text>
                        <Text>{error}</Text>
                    </Box>
                )}

                <Box
                    bg="bg.panel"
                    borderRadius="xl"
                    boxShadow="sm"
                    borderWidth="1px"
                    overflow="hidden"
                    minH="300px"
                    position="relative"
                >
                    {isLoading ? (
                        <Center h="300px">
                            <Stack align="center" gap="4">
                                <Spinner size="xl" color="blue.500" />
                                <Text color="fg.muted">
                                    Cargando deportes...
                                </Text>
                            </Stack>
                        </Center>
                    ) : sports.length === 0 ? (
                        <Center h="300px">
                            <Stack align="center" gap="4">
                                <Text color="fg.muted">
                                    No se encontraron deportes.
                                </Text>
                                <Button variant="ghost" onClick={fetchSports}>
                                    Reintentar
                                </Button>
                            </Stack>
                        </Center>
                    ) : (
                        <Table.Root size="md" variant="line" interactive>
                            <Table.Header>
                                <Table.Row bg="bg.muted/50">
                                    <Table.ColumnHeader py="4">
                                        Nombre
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">
                                        Descripción
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">
                                        Cupo
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">
                                        Precio adicional
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">
                                        Certificado médico
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py="4" textAlign="end">
                                        Acciones
                                    </Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {sports.map((sport) => (
                                    <Table.Row
                                        key={sport.id}
                                        _hover={{ bg: 'bg.muted/30' }}
                                    >
                                        <Table.Cell
                                            fontWeight="semibold"
                                            color="fg.emphasized"
                                        >
                                            {sport.name}
                                        </Table.Cell>
                                        <Table.Cell color="fg.muted">
                                            {sport.description}
                                        </Table.Cell>
                                        <Table.Cell color="fg.muted">
                                            {sport.max_capacity}
                                        </Table.Cell>
                                        <Table.Cell color="fg.muted">
                                            ${sport.additional_price}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Box
                                                display="inline-block"
                                                px="2"
                                                py="0.5"
                                                borderRadius="md"
                                                bg={
                                                    sport.requires_medical_certificate
                                                        ? 'orange.50'
                                                        : 'green.50'
                                                }
                                                color={
                                                    sport.requires_medical_certificate
                                                        ? 'orange.700'
                                                        : 'green.700'
                                                }
                                                fontSize="xs"
                                                fontWeight="bold"
                                            >
                                                {sport.requires_medical_certificate
                                                    ? 'Requerido'
                                                    : 'No requerido'}
                                            </Box>
                                        </Table.Cell>
                                        <Table.Cell textAlign="end">
                                            <HStack gap="2" justify="flex-end">
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label="Editar deporte"
                                                    onClick={() =>
                                                        openEditModal(sport)
                                                    }
                                                >
                                                    <LuPencil />
                                                </IconButton>
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    colorPalette="red"
                                                    aria-label="Eliminar deporte"
                                                    onClick={() =>
                                                        handleDeleteSport(
                                                            sport.id,
                                                            sport.name,
                                                        )
                                                    }
                                                >
                                                    <LuTrash2 />
                                                </IconButton>
                                            </HStack>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    )}
                </Box>
            </Stack>
        </DialogRoot>
    );
}
