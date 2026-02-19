import { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  useColorModeValue,
  Container,
  Heading,
  Card,
  CardBody,
  Divider,
  Flex
} from '@chakra-ui/react';
import Sidebar from './components/Sidebar';
import WalletApproval from './components/WalletApproval';
import DatabaseTest from './components/DatabaseTest';
import UserBalance from './components/UserBalance';
import UserSubscription from './components/UserSubscription';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('wallet-approval');

  const bg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    // Check if already logged in by persisted admin email
    const savedEmail = localStorage.getItem('admin_email');
    if (savedEmail) {
      setIsLoggedIn(true);
      setAdminEmail(savedEmail);
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Server returns { success, admin, message }
        const emailFromServer = data?.admin?.email || email;
        localStorage.setItem('admin_email', emailFromServer);
        setIsLoggedIn(true);
        setAdminEmail(emailFromServer);
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_email');
    setIsLoggedIn(false);
    setAdminEmail('');
    setEmail('');
    setPassword('');
    setActiveTab('wallet-approval');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'wallet-approval':
        return <WalletApproval />;
      case 'user-balance':
        return <UserBalance />;
      case 'database-test':
        return <DatabaseTest />;
      case 'user-subscription':
        return <UserSubscription />;
      default:
        return <WalletApproval />;
    }
  };

  if (!isLoggedIn) {
    return (
      <ChakraProvider>
        <Box minH="100vh" bg={bg} display="flex" alignItems="center" justifyContent="center">
          <Container maxW="md">
            <Card bg={cardBg} shadow="lg">
              <CardBody>
                <VStack spacing={6}>
                  <VStack spacing={2}>
                    <Heading size="lg" textAlign="center" color="blue.600">EvenOddPro</Heading>
                    <Text color="gray.600" textAlign="center">Admin Wallet Approval</Text>
                  </VStack>

                  <Divider />

                  <VStack spacing={4} w="full">
                    <FormControl isRequired>
                      <FormLabel>Email</FormLabel>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter admin email"
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Password</FormLabel>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                      />
                    </FormControl>

                    {error && (
                      <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        {error}
                      </Alert>
                    )}

                    <Button
                      colorScheme="blue"
                      size="lg"
                      w="full"
                      onClick={handleLogin}
                      isLoading={loading}
                      loadingText="Logging in..."
                    >
                      Login
                    </Button>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </Container>
        </Box>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider>
      <Flex minH="100vh" bg={bg}>
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={handleLogout}
          adminEmail={adminEmail}
        />

        {/* Main Content */}
        <Box flex={1} ml="260px" p={4} overflowX="auto" w="full">
          <Box maxW="none" w="full">
            {renderContent()}
          </Box>
        </Box>
      </Flex>
    </ChakraProvider>
  );
}

export default App;