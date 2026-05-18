import { Box, SimpleGrid, Heading, Text, VStack } from "@chakra-ui/react";
import { LuTrophy, LuUsers, LuFileText, LuReceipt } from "react-icons/lu";
import { SectionCard } from "../components/SectionCard";
export function HomeView() {
    return (
        <Box>
            <VStack gap="6" align="flex-start" mb="12">
                <Heading
                    size="4xl"
                    fontWeight="extrabold"
                    letterSpacing="tight"
                    bgGradient="to-r"
                    gradientFrom="blue.600"
                    gradientTo="cyan.400"
                    bgClip="text"
                >
                    Bienvenido a Alentapp
                </Heading>
                <Text fontSize="xl" color="fg.muted" maxW="2xl">
                    El panel de administración central para gestionar todos los
                    aspectos de tu club. Selecciona una sección a continuación
                    para comenzar.
                </Text>
            </VStack>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="8">
                <SectionCard
                    title="Miembros"
                    description="Administra el padrón de socios, sus categorías, estados de cuenta y datos personales."
                    to="/members"
                    icon={LuUsers}
                />
                <SectionCard
                    title="Deportes"
                    description="Administra la oferta deportiva, cupos, precios adicionales y requisitos médicos."
                    to="/sports"
                    icon={LuTrophy}
                />
                <SectionCard
                title="Inscripciones"
                description="Gestiona las inscripciones de miembros a deportes."
                to="/enrollments"
                icon={LuReceipt}
                />
                <SectionCard 
                    title="Certificados Médicos"
                    description="Administra los certificados médicos de los socios, vencimientos y validaciones."
                    to="/medical-certificates"
                    icon={LuFileText}
                />



                <SectionCard
                    title="Lockers"
                    description="Administra los lockers, su ubicación, estado y socio asignado."
                    to="/lockers"
                    icon={LuReceipt}
                />

                <SectionCard
                    title="Pagos"
                    description="Gestiona los pagos de las cuotas de los socios."
                    to="/payments"
                    icon={LuReceipt}
                />
                {/* Future sections can be added here following the same pattern */}
                <Box
                    p="6"
                    bg="bg.muted/30"
                    borderRadius="2xl"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    borderStyle="dashed"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    minH="250px"
                >
                    <VStack>
                        <Text color="fg.muted" fontWeight="medium">
                            Próximamente nuevas secciones
                        </Text>
                    </VStack>
                </Box>
            </SimpleGrid>
        </Box>
    );
}