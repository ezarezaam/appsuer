import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Spinner,
  Badge,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider
} from '@chakra-ui/react';
import { FiDatabase, FiRefreshCw, FiCheck, FiX, FiInfo, FiUsers, FiCreditCard } from 'react-icons/fi';
import { testConnection, getAllTopupRequests } from '../services/realBalanceService';

const DatabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [requestsData, setRequestsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDatabaseConnection = async () => {
    setLoading(true);
    setConnectionStatus('testing');
    setConnectionError(null);
    setRequestsData(null);

    try {
      // Test basic connection
      console.log('Testing database connection...');
      const connectionResult = await testConnection();
      
      if (!connectionResult.success) {
        throw new Error(connectionResult.error?.message || 'Connection failed');
      }

      console.log('✅ Connection successful, fetching data...');
      
      // Try to get actual data
      const requestsResult = await getAllTopupRequests();
      
      if (!requestsResult.success) {
        throw new Error(requestsResult.error?.message || 'Failed to fetch data');
      }

      console.log('✅ Data fetched successfully:', requestsResult);
      
      setConnectionStatus('success');
      setRequestsData(requestsResult);
      
    } catch (error: any) {
      console.error('❌ Database test failed:', error);
      setConnectionStatus('error');
      setConnectionError(error.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto test on mount
    testDatabaseConnection();
  }, []);

  return (
    <VStack spacing={6} align="stretch">
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FiDatabase} color="blue.500" />
            <Heading size="md" color="blue.600">Database Connection Test</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack>
              <Button 
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={testDatabaseConnection} 
                isLoading={loading}
                colorScheme="blue"
                size="md"
              >
                Test Connection
              </Button>
              <Badge 
                colorScheme={
                  connectionStatus === 'success' ? 'green' : 
                  connectionStatus === 'error' ? 'red' : 
                  connectionStatus === 'testing' ? 'yellow' : 'gray'
                }
                px={3}
                py={1}
                fontSize="sm"
              >
                <Icon 
                  as={
                    connectionStatus === 'success' ? FiCheck : 
                    connectionStatus === 'error' ? FiX : 
                    FiDatabase
                  } 
                  mr={1} 
                />
                {connectionStatus.toUpperCase()}
              </Badge>
            </HStack>

            {loading && (
              <HStack>
                <Spinner size="sm" color="blue.500" />
                <Text color="gray.600">Testing database connection...</Text>
              </HStack>
            )}

            {connectionStatus === 'error' && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Connection Failed!</AlertTitle>
                  <AlertDescription>
                    {connectionError}
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {connectionStatus === 'success' && (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Connection Successful!</AlertTitle>
                  <AlertDescription>
                    Database is accessible and responding properly.
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </VStack>
        </CardBody>
      </Card>

      {requestsData && (
        <Card>
          <CardHeader>
            <HStack>
              <Icon as={FiInfo} color="green.500" />
              <Heading size="md" color="green.600">Database Statistics</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
              <Card variant="outline">
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FiCreditCard} />
                        <Text>Topup Requests</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color="blue.500">
                      {requestsData.info?.topup_requests_count || 0}
                    </StatNumber>
                    <StatHelpText>Total in database</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card variant="outline">
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FiUsers} />
                        <Text>User Profiles</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color="green.500">
                      {requestsData.info?.user_profiles_count || 0}
                    </StatNumber>
                    <StatHelpText>Registered users</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card variant="outline">
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FiDatabase} />
                        <Text>Active Requests</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber color="purple.500">
                      {requestsData.requests?.length || 0}
                    </StatNumber>
                    <StatHelpText>Currently loaded</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>
            
            {requestsData.info?.sample_topup_data && requestsData.info.sample_topup_data.length > 0 && (
              <Box mb={4}>
                <Text fontWeight="semibold" mb={2} color="gray.700">Sample Topup Request:</Text>
                <Code p={3} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap" bg="gray.50">
                  {JSON.stringify(requestsData.info.sample_topup_data[0], null, 2)}
                </Code>
              </Box>
            )}

            {requestsData.info?.sample_profile_data && requestsData.info.sample_profile_data.length > 0 && (
              <Box mb={4}>
                <Text fontWeight="semibold" mb={2} color="gray.700">Sample User Profile:</Text>
                <Code p={3} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap" bg="gray.50">
                  {JSON.stringify(requestsData.info.sample_profile_data[0], null, 2)}
                </Code>
              </Box>
            )}
            
            {requestsData.requests && requestsData.requests.length === 0 && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">No Requests Found</AlertTitle>
                  <AlertDescription fontSize="sm">
                    No topup requests found in database. This is normal if no users have made any topup requests yet.
                    <br />
                    <Text as="span" fontWeight="medium">Note:</Text> This admin panel is for approving topup requests from the main EvenOddPro application.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {requestsData.requests && requestsData.requests.length > 0 && (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Requests Available!</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Found {requestsData.requests.length} topup requests! You can now use the "Wallet Approval" tab to manage them.
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FiInfo} color="gray.500" />
            <Heading size="md" color="gray.600">Environment Configuration</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <Code p={4} borderRadius="md" fontSize="sm" bg="gray.50" w="full">
            <VStack align="start" spacing={1}>
              <HStack>
                <Text fontWeight="medium">VITE_SUPABASE_URL:</Text>
                <Badge colorScheme={import.meta.env.VITE_SUPABASE_URL ? 'green' : 'red'}>
                  <Icon as={import.meta.env.VITE_SUPABASE_URL ? FiCheck : FiX} mr={1} />
                  {import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing'}
                </Badge>
              </HStack>
              <HStack>
                <Text fontWeight="medium">VITE_SUPABASE_ANON_KEY:</Text>
                <Badge colorScheme={import.meta.env.VITE_SUPABASE_ANON_KEY ? 'green' : 'red'}>
                  <Icon as={import.meta.env.VITE_SUPABASE_ANON_KEY ? FiCheck : FiX} mr={1} />
                  {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}
                </Badge>
              </HStack>
            </VStack>
          </Code>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default DatabaseTest;