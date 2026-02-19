import type { FC } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Divider,
  useColorModeValue,
  Badge,

} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  SettingsIcon,
  AddIcon,
  ViewIcon,
  StarIcon
} from '@chakra-ui/icons';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  adminEmail?: string;
}

const Sidebar: FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  adminEmail
}) => {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const activeColor = useColorModeValue('blue.600', 'blue.200');

  const menuItems = [
    {
      id: 'wallet-approval',
      label: 'Wallet Approval',
      icon: CheckCircleIcon,
      description: 'Kelola persetujuan top-up'
    },
    {
      id: 'user-balance',
      label: 'User Balance',
      icon: StarIcon,
      description: 'Monitor saldo & transaksi user'
    },
    {
      id: 'database-test',
      label: 'Database Test',
      icon: SettingsIcon,
      description: 'Test koneksi database'
    },
    {
      id: 'user-subscription',
      label: 'User Subscribtion',
      icon: AddIcon,
      description: 'Kelola langganan pengguna'
    }
  ];

  return (
    <Box
      w="260px"
      h="100vh"
      bg={bg}
      borderRight="1px"
      borderColor={borderColor}
      position="fixed"
      left={0}
      top={0}
      zIndex={1000}
      overflowY="auto"
    >
      <VStack spacing={0} align="stretch" h="full">
        {/* Header */}
        <Box p={6} borderBottom="1px" borderColor={borderColor}>
          <VStack spacing={3} align="start">
            <HStack spacing={3}>
              <Box
                w={10}
                h={10}
                bg="blue.500"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={ViewIcon} color="white" boxSize={5} />
              </Box>
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold" fontSize="lg">
                  EvenOddPro
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Wallet Admin
                </Text>
              </VStack>
            </HStack>

            {adminEmail && (
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>
                  Logged in as:
                </Text>
                <Badge colorScheme="green" fontSize="xs" px={2} py={1}>
                  {adminEmail}
                </Badge>
              </Box>
            )}
          </VStack>
        </Box>

        {/* Navigation Menu */}
        <Box flex={1} p={4}>
          <VStack spacing={2} align="stretch">
            <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={2} px={3}>
              MENU UTAMA
            </Text>

            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                justifyContent="flex-start"
                h="auto"
                p={3}
                bg={activeTab === item.id ? activeBg : 'transparent'}
                color={activeTab === item.id ? activeColor : 'inherit'}
                _hover={{
                  bg: activeTab === item.id ? activeBg : hoverBg
                }}
                onClick={() => onTabChange(item.id)}
                borderRadius="lg"
              >
                <HStack spacing={3} align="start" w="full">
                  <Icon
                    as={item.icon}
                    boxSize={5}
                    color={activeTab === item.id ? activeColor : 'gray.500'}
                    mt={0.5}
                  />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontWeight="medium" fontSize="sm">
                      {item.label}
                    </Text>
                    <Text fontSize="xs" color="gray.500" textAlign="left">
                      {item.description}
                    </Text>
                  </VStack>
                </HStack>
              </Button>
            ))}
          </VStack>
        </Box>

        {/* Footer */}
        <Box p={4} borderTop="1px" borderColor={borderColor}>
          <VStack spacing={3}>
            <Divider />
            <Button
              variant="outline"
              colorScheme="red"
              size="sm"
              w="full"
              onClick={onLogout}
            >
              Logout
            </Button>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              © 2024 EvenOddPro Admin Panel
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default Sidebar;