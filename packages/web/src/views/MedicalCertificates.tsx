import {
  Button, Heading, HStack, Stack, Text, Box, Flex,
  Input, Spinner, Center, Table, IconButton,
} from "@chakra-ui/react";
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import { medicalCertificatesService } from "../services/medicalCertificates";
import { membersService } from "../services/members";
import type {
  MemberDTO,
  MedicalCertificateDTO,
  CreateMedicalCertificateRequest,
  UpdateMedicalCertificateRequest,
} from "@alentapp/shared";
import { Field } from "../components/ui/field";
import {
  SelectRoot, SelectTrigger, SelectValueText,
  SelectContent, SelectItem, createListCollection,
} from "../components/ui/select";
import {
  DialogRoot, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger,
} from "../components/ui/dialog";
const validateCollection = createListCollection({
  items: [
    { label: "Sí", value: "true" },
    { label: "No", value: "false" },
  ],
});
export function MedicalCertificatesView() {
  const [certificates, setCertificates] = useState<MedicalCertificateDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateMedicalCertificateRequest>({
    memberId: "",
    expiryDate: "",
    doctorLicense: "",
  });
  const [editIsValidated, setEditIsValidated] = useState("true");
  const fetchCertificates = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setError(null);
    try {
      const data = await medicalCertificatesService.getAll();
      setCertificates(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los certificados");
    } finally {
      setIsLoading(false);
    }
  };
  const fetchMembers = async () => {
    try {
      const data = await membersService.getAll();
      setMembers(data);
    } catch {}
  };
  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ memberId: "", expiryDate: "", doctorLicense: "" });
    setEditIsValidated("true");
    setIsDialogOpen(true);
  };
  const openEditModal = (cert: MedicalCertificateDTO) => {
    setEditingId(cert.id);
    setFormData({
      memberId: cert.memberId,
      expiryDate: cert.expiryDate.split("T")[0],
      doctorLicense: cert.doctorLicense,
    });
    setEditIsValidated(cert.isValidated ? "true" : "false");
    setIsDialogOpen(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (editingId) {
        const updateData: UpdateMedicalCertificateRequest = {};
        if (formData.expiryDate) updateData.expiryDate = formData.expiryDate;
        updateData.isValidated = editIsValidated === "true";
        await medicalCertificatesService.update(editingId, updateData);
        setSuccessMessage("Certificado actualizado exitosamente.");
      } else {
        await medicalCertificatesService.create(formData);
        setSuccessMessage("Certificado creado exitosamente.");
        setFormData({ memberId: "", expiryDate: "", doctorLicense: "" });
      }
      setIsDialogOpen(false);
      fetchCertificates();
    } catch (err: any) {
      setError(err.message || "Error al guardar el certificado");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = async (id: string, memberName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el certificado médico de "${memberName}"? Esta acción no se puede deshacer.`)) {
      try {
        setError(null);
        setSuccessMessage(null);
        await medicalCertificatesService.delete(id);
        setSuccessMessage("Certificado eliminado correctamente.");
        fetchCertificates();
      } catch (err: any) {
        setError(err.message || "Error al eliminar el certificado");
      }
    }
  };
  const getMemberName = (memberId: string) => {
    return members.find((m) => m.id === memberId)?.name || memberId;
  };
  const membersCollection = createListCollection({
    items: members.map((m) => ({
      label: `${m.name} - ${m.dni}`,
      value: m.id,
    })),
  });
  useEffect(() => {
    fetchCertificates();
    fetchMembers();
  }, []);
  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Certificados Médicos</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona los certificados médicos de los socios.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={() => { fetchCertificates(); fetchMembers(); }} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Certificado
            </Button>
          </HStack>
        </Flex>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Certificado Médico" : "Nuevo Certificado Médico"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                {editingId ? (
                  <>
                    <Field label="Socio">
                      <Text fontWeight="semibold">{getMemberName(formData.memberId)}</Text>
                    </Field>
                    <Field label="Fecha de Emisión">
                      <Text fontWeight="semibold">
                        {certificates.find((c) => c.id === editingId)?.issueDate.split("T")[0] || ""}
                      </Text>
                    </Field>
                    <Field label="Número de Licencia">
                      <Text fontWeight="semibold">{formData.doctorLicense}</Text>
                    </Field>
                  </>
                ) : (
                  <Field label="Socio" required>
                    <SelectRoot
                      collection={membersCollection}
                      value={formData.memberId ? [formData.memberId] : []}
                      onValueChange={(e) => setFormData({ ...formData, memberId: e.value[0] })}
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
                  </Field>
                )}
                <Field label="Fecha de Vencimiento" required>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    required
                  />
                </Field>
                {!editingId && (
                  <Field label="Número de Licencia" required>
                    <Input
                      placeholder="Ej. 123456"
                      value={formData.doctorLicense}
                      onChange={(e) => setFormData({ ...formData, doctorLicense: e.target.value })}
                      required
                    />
                  </Field>
                )}
                {editingId && (
                  <Field label="Certificado Válido">
                    <SelectRoot
                      collection={validateCollection}
                      value={[editIsValidated]}
                      onValueChange={(e) => setEditIsValidated(e.value[0])}
                    >
                      <SelectTrigger>
                        <SelectValueText />
                      </SelectTrigger>
                      <SelectContent>
                        {validateCollection.items.map((item) => (
                          <SelectItem item={item} key={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingId ? "Guardar Cambios" : "Crear Certificado"}
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
        {successMessage && (
          <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
            <Text fontWeight="bold">Éxito:</Text>
            <Text>{successMessage}</Text>
          </Box>
        )}
        <Box bg="bg.panel" borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden" minH="300px">
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando certificados...</Text>
              </Stack>
            </Center>
          ) : certificates.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron certificados.</Text>
                <Button variant="ghost" onClick={fetchCertificates}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Emisión</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Vencimiento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Licencia</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Válido</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {certificates.map((cert) => (
                  <Table.Row key={cert.id}>
                    <Table.Cell fontWeight="semibold">{getMemberName(cert.memberId)}</Table.Cell>
                    <Table.Cell color="fg.muted">{cert.issueDate.split("T")[0]}</Table.Cell>
                    <Table.Cell color="fg.muted">{cert.expiryDate.split("T")[0]}</Table.Cell>
                    <Table.Cell color="fg.muted">{cert.doctorLicense}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block" px="2" py="0.5" borderRadius="md"
                        bg={cert.isValidated ? "green.50" : "red.50"}
                        color={cert.isValidated ? "green.700" : "red.700"}
                        fontSize="xs" fontWeight="bold"
                      >
                        {cert.isValidated ? "Sí" : "No"}
                      </Box>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <IconButton
                        variant="ghost" size="sm"
                        aria-label="Editar certificado"
                        onClick={() => openEditModal(cert)}
                      >
                        <LuPencil />
                      </IconButton>
                      <IconButton
                        variant="ghost" size="sm"
                        colorPalette="red"
                        aria-label="Eliminar certificado"
                        onClick={() => handleDelete(cert.id, getMemberName(cert.memberId))}
                      >
                        <LuTrash2 />
                      </IconButton>
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