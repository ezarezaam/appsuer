import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  Input,
  Icon,
  Avatar,
  Divider,
  Card,
  CardBody,
  CardHeader,
  Heading,
  TableContainer,
  useColorModeValue,
  useToast,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { SearchIcon, ViewIcon } from '@chakra-ui/icons';
import { FaEye, FaPlus, FaMinus, FaUsers, FaWallet, FaChartLine } from 'react-icons/fa';
import { supabaseAdmin } from '../lib/supabase';

interface UserBalance {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
  user_email?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id: string;
  created_at: string;
}

interface TransactionWithUser extends Transaction {
  user_email?: string;
  full_name?: string;
}

const UserBalance: React.FC = () => {
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const adjustModal = useDisclosure();
  const toast = useToast();

  const [adjustType, setAdjustType] = useState<'topup' | 'deduct' | 'refund'>('topup');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustDescription, setAdjustDescription] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState<boolean>(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'transactions'>('list');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [globalTransactions, setGlobalTransactions] = useState<TransactionWithUser[]>([]);
  const [globalTransactionLoading, setGlobalTransactionLoading] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const defaultTypes: string[] = ['topup', 'deduct', 'refund', 'donation', 'premium_purchase', 'transfer'];
  const availableTypes: string[] = Array.from(new Set([...defaultTypes, ...transactions.map(t => t.transaction_type)]));
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const usersMap = useMemo(() => {
    const map = new Map<string, UserBalance>();
    users.forEach(u => map.set(u.user_id, u));
    return map;
  }, [users]);

  useEffect(() => {
    fetchUsersWithBalance();
  }, []);

  const fetchUsersWithBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching users with balance...');

      // Fetch users with balance - menggunakan supabaseAdmin untuk bypass RLS
      const { data: balanceData, error: balanceError } = await supabaseAdmin
        .from('user_balance')
        .select('*')
        .order('balance', { ascending: false });

      console.log('Balance data:', balanceData);
      console.log('Balance error:', balanceError);

      if (balanceError) {
        throw balanceError;
      }

      if (!balanceData || balanceData.length === 0) {
        console.log('No balance data found');
        setUsers([]);
        return;
      }

      // Get user profiles untuk setiap user_id dari user_balance
      const usersWithProfiles = await Promise.all(
        balanceData.map(async (balance) => {
          try {
            // Ambil profile data dari user_profiles (data dari evenoddpro_web_2.2) - menggunakan supabaseAdmin
            const { data: profileData, error: profileError } = await supabaseAdmin
              .from('user_profiles')
              .select('full_name, phone, avatar_url')
              .eq('id', balance.user_id)
              .single();

            console.log(`Profile data for ${balance.user_id}:`, profileData);

            // Coba ambil email dari auth.users jika memungkinkan
            let email = `user-${balance.user_id.slice(0, 8)}@evenoddpro.com`;
            let full_name = profileData?.full_name || 'EvenOddPro User';
            
            // Jika ada profile data, gunakan itu
            if (profileData) {
              full_name = profileData.full_name || 'EvenOddPro User';
            }

            return {
              ...balance,
              user_email: email,
              full_name,
              phone: profileData?.phone || '',
              avatar_url: profileData?.avatar_url || ''
            };
          } catch (error) {
            console.error('Error fetching profile for user:', balance.user_id, error);
            return {
              ...balance,
              user_email: `user-${balance.user_id.slice(0, 8)}@evenoddpro.com`,
              full_name: 'EvenOddPro User',
              phone: '',
              avatar_url: ''
            };
          }
        })
      );

      console.log('Final users with profiles:', usersWithProfiles);
      setUsers(usersWithProfiles);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTransactions = async () => {
    try {
      setGlobalTransactionLoading(true);
      setGlobalError(null);
      const { data, error } = await supabaseAdmin
        .from('balance_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        throw new Error(error.message || 'Failed to fetch all transactions');
      }

      const enriched = (data || []).map((tx: any) => {
        const info = usersMap.get(tx.user_id);
        return {
          ...tx,
          user_email: info?.user_email,
          full_name: info?.full_name,
        } as TransactionWithUser;
      });

      setGlobalTransactions(enriched);
    } catch (err: any) {
      console.error('Error fetching all transactions:', err);
      setGlobalTransactions([]);
      setGlobalError(err.message || 'Failed to fetch all transactions');
    } finally {
      setGlobalTransactionLoading(false);
    }
  };

  const handleListTabsChange = (index: number) => {
    if (index === 1) {
      fetchAllTransactions();
    }
  };

  const fetchUserTransactions = async (userId: string) => {
    try {
      setTransactionLoading(true);
      
      const response = await fetch(`/api/transactions/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET_KEY
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions || []);
      } else {
        throw new Error(data.error || 'Failed to fetch transactions');
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleViewTransactions = async (user: UserBalance) => {
    setSelectedUser(user);
    setTransactions([]);
    setViewMode('transactions');
    await fetchUserTransactions(user.user_id);
  };

  const openAdjustModal = (user: UserBalance, type: 'topup' | 'deduct') => {
    setSelectedUser(user);
    setAdjustType(type);
    setAdjustAmount('');
    setAdjustDescription('');
    setAdjustError(null);
    adjustModal.onOpen();
  };

  const submitAdjust = async () => {
    if (!selectedUser) return;
    try {
      setAdjustLoading(true);
      setAdjustError(null);

      const amountNum = Number(adjustAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setAdjustError('Jumlah harus lebih dari 0');
        setAdjustLoading(false);
        return;
      }

      const response = await fetch(`/api/balance/${selectedUser.user_id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET_KEY
        },
        body: JSON.stringify({
          amount: amountNum,
          transaction_type: adjustType,
          description: adjustDescription || null
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Gagal memperbarui saldo');
      }

      toast({
        title: 'Saldo berhasil diperbarui',
        description: `Saldo ${adjustType === 'deduct' ? 'dikurangi' : 'ditambah'} sebesar ${formatCurrency(amountNum)}`,
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      adjustModal.onClose();
      await fetchUsersWithBalance();
      await fetchUserTransactions(selectedUser.user_id);
    } catch (err: any) {
      console.error('Adjust balance error:', err);
      setAdjustError(err.message || 'Terjadi kesalahan saat memperbarui saldo');
      toast({
        title: 'Gagal memperbarui saldo',
        description: err.message || 'Terjadi kesalahan',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setAdjustLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };
  
  const formatTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      topup: 'Topup',
      deduct: 'Deduct',
      refund: 'Refund',
      donation: 'Donation',
      premium_purchase: 'Premium Purchase',
      transfer: 'Transfer'
    };
    return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'topup':
        return 'green';
      case 'deduct':
        return 'red';
      case 'refund':
        return 'blue';
      case 'donation':
        return 'purple';
      case 'premium_purchase':
        return 'orange';
      case 'transfer':
        return 'teal';
      default:
        return 'gray';
    }
  };

  const filteredUsers = users.filter(user =>
    user.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );



  return (
    <Box p={4} w="full" maxW="none">
      <VStack spacing={4} align="stretch" w="full">
        {/* Header Section */}
        <Box>
          <Heading size="lg" mb={2} color="blue.600">
            <Icon as={FaUsers} mr={3} />
            User Balance Management
          </Heading>
          <Text color="gray.600">
            Kelola saldo pengguna dari aplikasi EvenOddPro
          </Text>
        </Box>

        {/* Statistics Cards */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="full">
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Users</StatLabel>
                <StatNumber color="blue.500">
                  <Icon as={FaUsers} mr={2} />
                  {users.length}
                </StatNumber>
                <StatHelpText>Active users with balance</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Balance</StatLabel>
                <StatNumber color="green.500">
                  <Icon as={FaWallet} mr={2} />
                  {formatCurrency(users.reduce((sum, user) => sum + user.balance, 0))}
                </StatNumber>
                <StatHelpText>Combined user balances</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Average Balance</StatLabel>
                <StatNumber color="purple.500">
                  <Icon as={FaChartLine} mr={2} />
                  {users.length > 0 ? formatCurrency(users.reduce((sum, user) => sum + user.balance, 0) / users.length) : formatCurrency(0)}
                </StatNumber>
                <StatHelpText>Per user average</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Search and Filters */}
        <Card>
          <CardBody>
            <HStack spacing={4}>
              <InputGroup maxW="400px">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Cari berdasarkan nama atau email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
              <Button
                colorScheme="blue"
                onClick={fetchUsersWithBalance}
                isLoading={loading}
                leftIcon={<Icon as={FaUsers} />}
              >
                Refresh Data
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {/* Main Content */}
        {viewMode === 'transactions' ? (
          <Card>
            <CardHeader>
              <HStack justify="space-between" align="center">
                <Heading size="md">User Transactions</Heading>
                <HStack>
                  <Button variant="ghost" onClick={() => setViewMode('list')}>Kembali</Button>
                  {selectedUser && (
                    <>
                      <Button size="sm" colorScheme="green" variant="outline" leftIcon={<Icon as={FaPlus} />} onClick={() => openAdjustModal(selectedUser, 'topup')}>Add Balance</Button>
                      <Button size="sm" colorScheme="red" variant="outline" leftIcon={<Icon as={FaMinus} />} onClick={() => openAdjustModal(selectedUser, 'deduct')}>Reduce Balance</Button>
                    </>
                  )}
                </HStack>
              </HStack>
            </CardHeader>
            <CardBody>
              {selectedUser && (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={2}>User Information</Heading>
                      <HStack spacing={3}>
                        <Avatar size="sm" name={selectedUser.full_name || selectedUser.user_email} src={selectedUser.avatar_url} />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium" fontSize="sm">{selectedUser.full_name || 'Unknown User'}</Text>
                          <Text fontSize="xs" color="gray.500">{selectedUser.user_email}</Text>
                          <Text fontSize="xs" color="gray.400">ID: {selectedUser.user_id}</Text>
                        </VStack>
                      </HStack>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <Heading size="sm" mb={2}>Balance</Heading>
                      <HStack>
                        <Badge colorScheme="green">{formatCurrency(selectedUser.balance)}</Badge>
                        <Text fontSize="xs" color="gray.500">Updated: {formatDate(selectedUser.updated_at)}</Text>
                      </HStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              )}

              <Card mb={4}>
                <CardBody>
                  <HStack spacing={4} flexWrap="wrap">
                    <HStack>
                      <Text fontSize="sm" color="gray.600">Filter Type</Text>
                      <Select maxW="220px" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="all">All</option>
                        {availableTypes.map((t) => (
                          <option key={t} value={t}>{formatTypeLabel(t)}</option>
                        ))}
                      </Select>
                    </HStack>
                    <HStack>
                      <Text fontSize="sm" color="gray.600">From</Text>
                      <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} maxW="200px" />
                    </HStack>
                    <HStack>
                      <Text fontSize="sm" color="gray.600">To</Text>
                      <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} maxW="200px" />
                    </HStack>
                    <Button colorScheme="blue" variant="outline" onClick={() => selectedUser && fetchUserTransactions(selectedUser.user_id)} isLoading={transactionLoading}>Refresh</Button>
                  </HStack>
                </CardBody>
              </Card>

              {transactionLoading ? (
                <Box textAlign="center" py={10}><Spinner size="lg" color="blue.500" /><Text mt={4} color="gray.600">Loading transaksi...</Text></Box>
              ) : error ? (
                <Alert status="error"><AlertIcon /><AlertDescription>{error}</AlertDescription></Alert>
              ) : (
                <TableContainer>
                  <Table variant="simple" size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Tanggal</Th>
                        <Th>Tipe</Th>
                        <Th isNumeric>Jumlah</Th>
                        <Th isNumeric>Saldo Sebelum</Th>
                        <Th isNumeric>Saldo Sesudah</Th>
                        <Th>Deskripsi</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {transactions
                        .filter(tx => {
                          const typeOk = typeFilter === 'all' || tx.transaction_type === typeFilter;
                          const date = new Date(tx.created_at);
                          const fromOk = fromDate ? date >= new Date(fromDate) : true;
                          const toOk = toDate ? date <= new Date(toDate + 'T23:59:59') : true;
                          return typeOk && fromOk && toOk;
                        })
                        .map((transaction) => (
                          <Tr key={transaction.id}>
                            <Td><Text fontSize="sm">{formatDate(transaction.created_at)}</Text></Td>
                            <Td>
                              <Badge colorScheme={getTransactionTypeColor(transaction.transaction_type)} textTransform="capitalize">
                                {transaction.transaction_type}
                              </Badge>
                            </Td>
                            <Td isNumeric>
                              <Text color={transaction.transaction_type === 'deduct' ? 'red.500' : 'green.500'} fontWeight="medium">
                                {transaction.transaction_type === 'deduct' ? '-' : '+'}{formatCurrency(transaction.amount)}
                              </Text>
                            </Td>
                            <Td isNumeric>{formatCurrency(transaction.balance_before)}</Td>
                            <Td isNumeric><Text fontWeight="medium">{formatCurrency(transaction.balance_after)}</Text></Td>
                            <Td><Text fontSize="sm" noOfLines={2}>{transaction.description || '-'}</Text></Td>
                          </Tr>
                        ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </CardBody>
          </Card>
        ) : loading ? (
          <Box textAlign="center" py={10}>
            <Spinner size="xl" color="blue.500" />
            <Text mt={4} color="gray.600">Loading user data...</Text>
          </Box>
        ) : error ? (
          <Alert status="error">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <Heading size="md">User Balance List</Heading>
            </CardHeader>
            <CardBody>
              <Tabs onChange={handleListTabsChange} isFitted variant="enclosed">
                <TabList mb={4}>
                  <Tab>By User</Tab>
                  <Tab>Transactions</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel p={0}>
                    {filteredUsers.length === 0 ? (
                      <Box textAlign="center" py={10}>
                        <Icon as={FaUsers} boxSize={12} color="gray.300" mb={4} />
                        <Text fontSize="lg" color="gray.500" mb={2}>
                          No users found
                        </Text>
                        <Text color="gray.400">
                          {searchTerm ? 'Try adjusting your search terms' : 'No users with balance data available'}
                        </Text>
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table variant="simple">
                          <Thead bg="gray.50">
                            <Tr>
                              <Th>User Information</Th>
                              <Th>Email</Th>
                              <Th isNumeric>Balance</Th>
                              <Th>Created</Th>
                              <Th>Last Updated</Th>
                              <Th>Actions</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {filteredUsers.map((user) => (
                              <Tr key={user.id} _hover={{ bg: 'gray.50' }}>
                                <Td>
                                  <HStack spacing={3}>
                                    <Avatar size="sm" name={user.full_name || user.user_email} src={user.avatar_url} />
                                    <VStack align="start" spacing={0}>
                                      <Text fontWeight="medium" fontSize="sm">{user.full_name || 'Unknown User'}</Text>
                                      {user.phone && (
                                        <Text fontSize="xs" color="gray.400">{user.phone}</Text>
                                      )}
                                    </VStack>
                                  </HStack>
                                </Td>
                                <Td>
                                  <Text fontSize="sm" color="gray.600">{user.user_email}</Text>
                                </Td>
                                <Td isNumeric>
                                  <Text fontWeight="bold" color={user.balance > 0 ? 'green.500' : 'gray.500'} fontSize="md">
                                    {formatCurrency(user.balance)}
                                  </Text>
                                </Td>
                                <Td>
                                  <Text fontSize="sm" color="gray.600">{formatDate(user.created_at)}</Text>
                                </Td>
                                <Td>
                                  <Text fontSize="sm" color="gray.600">{formatDate(user.updated_at)}</Text>
                                </Td>
                                <Td>
                                  <HStack spacing={2}>
                                    <Button size="sm" colorScheme="blue" variant="outline" leftIcon={<ViewIcon />} onClick={() => handleViewTransactions(user)}>
                                      Lihat Transaksi
                                    </Button>
                                    <Button size="sm" colorScheme="green" variant="outline" leftIcon={<Icon as={FaPlus} />} onClick={() => openAdjustModal(user, 'topup')}>
                                      Add Balance
                                    </Button>
                                    <Button size="sm" colorScheme="red" variant="outline" leftIcon={<Icon as={FaMinus} />} onClick={() => openAdjustModal(user, 'deduct')}>
                                      Reduce Balance
                                    </Button>
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    )}
                  </TabPanel>
                  <TabPanel>
                    <Card mb={4}>
                      <CardBody>
                        <HStack spacing={4} flexWrap="wrap">
                          <HStack>
                            <Text fontSize="sm" color="gray.600">Filter Type</Text>
                            <Select maxW="220px" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                              <option value="all">All</option>
                              {availableTypes.map((t) => (
                                <option key={t} value={t}>{formatTypeLabel(t)}</option>
                              ))}
                            </Select>
                          </HStack>
                          <HStack>
                            <Text fontSize="sm" color="gray.600">From</Text>
                            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} maxW="200px" />
                          </HStack>
                          <HStack>
                            <Text fontSize="sm" color="gray.600">To</Text>
                            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} maxW="200px" />
                          </HStack>
                          <Button colorScheme="blue" variant="outline" onClick={fetchAllTransactions} isLoading={globalTransactionLoading}>Refresh</Button>
                        </HStack>
                      </CardBody>
                    </Card>

                    {globalTransactionLoading ? (
                      <Box textAlign="center" py={10}><Spinner size="lg" color="blue.500" /><Text mt={4} color="gray.600">Loading transaksi...</Text></Box>
                    ) : globalError ? (
                      <Alert status="error"><AlertIcon /><AlertDescription>{globalError}</AlertDescription></Alert>
                    ) : (
                      <TableContainer>
                        <Table variant="simple" size="sm">
                          <Thead bg="gray.50">
                            <Tr>
                              <Th>Tanggal</Th>
                              <Th>Tipe</Th>
                              <Th isNumeric>Jumlah</Th>
                              <Th isNumeric>Saldo Sebelum</Th>
                              <Th isNumeric>Saldo Sesudah</Th>
                              <Th>Nama</Th>
                              <Th>Email</Th>
                              <Th>Deskripsi</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {globalTransactions
                              .filter(tx => {
                                const typeOk = typeFilter === 'all' || tx.transaction_type === typeFilter;
                                const date = new Date(tx.created_at);
                                const fromOk = fromDate ? date >= new Date(fromDate) : true;
                                const toOk = toDate ? date <= new Date(toDate + 'T23:59:59') : true;
                                return typeOk && fromOk && toOk;
                              })
                              .map((transaction) => (
                                <Tr key={transaction.id}>
                                  <Td><Text fontSize="sm">{formatDate(transaction.created_at)}</Text></Td>
                                  <Td>
                                    <Badge colorScheme={getTransactionTypeColor(transaction.transaction_type)} textTransform="capitalize">
                                      {transaction.transaction_type}
                                    </Badge>
                                  </Td>
                                  <Td isNumeric>
                                    <Text color={transaction.transaction_type === 'deduct' ? 'red.500' : 'green.500'} fontWeight="medium">
                                      {transaction.transaction_type === 'deduct' ? '-' : '+'}{formatCurrency(transaction.amount)}
                                    </Text>
                                  </Td>
                                  <Td isNumeric>{formatCurrency(transaction.balance_before)}</Td>
                                  <Td isNumeric><Text fontWeight="medium">{formatCurrency(transaction.balance_after)}</Text></Td>
                                  <Td><Text fontSize="sm">{transaction.full_name || usersMap.get(transaction.user_id)?.full_name || '-'}</Text></Td>
                                  <Td><Text fontSize="sm">{transaction.user_email || usersMap.get(transaction.user_id)?.user_email || '-'}</Text></Td>
                                  <Td><Text fontSize="sm" noOfLines={2}>{transaction.description || '-'}</Text></Td>
                                </Tr>
                              ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>
        )}
      </VStack>

      {/* Transaction Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={2}>
              <Text>Riwayat Transaksi</Text>
              {selectedUser && (
                <HStack>
                  <Text fontSize="sm" color="gray.600">
                    User: {selectedUser.user_email}
                  </Text>
                  <Badge colorScheme="green">
                    Saldo: {formatCurrency(selectedUser.balance)}
                  </Badge>
                </HStack>
              )}
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {transactionLoading ? (
              <Box display="flex" justifyContent="center" py={8}>
                <VStack spacing={4}>
                  <Spinner size="lg" color="blue.500" />
                  <Text>Loading transaksi...</Text>
                </VStack>
              </Box>
            ) : transactions.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">Belum ada transaksi</Text>
              </Box>
            ) : (
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Tanggal</Th>
                      <Th>Tipe</Th>
                      <Th isNumeric>Jumlah</Th>
                      <Th isNumeric>Saldo Sebelum</Th>
                      <Th isNumeric>Saldo Sesudah</Th>
                      <Th>Deskripsi</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {transactions.map((transaction) => (
                      <Tr key={transaction.id}>
                        <Td>
                          <Text fontSize="sm">
                            {formatDate(transaction.created_at)}
                          </Text>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={getTransactionTypeColor(transaction.transaction_type)}
                            textTransform="capitalize"
                          >
                            {transaction.transaction_type}
                          </Badge>
                        </Td>
                        <Td isNumeric>
                          <Text
                            color={
                              transaction.transaction_type === 'deduct' 
                                ? 'red.500' 
                                : 'green.500'
                            }
                            fontWeight="medium"
                          >
                            {transaction.transaction_type === 'deduct' ? '-' : '+'}
                            {formatCurrency(transaction.amount)}
                          </Text>
                        </Td>
                        <Td isNumeric>
                          {formatCurrency(transaction.balance_before)}
                        </Td>
                        <Td isNumeric>
                          <Text fontWeight="medium">
                            {formatCurrency(transaction.balance_after)}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm" noOfLines={2}>
                            {transaction.description || '-'}
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Tutup</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Adjust Balance Modal */}
      <Modal isOpen={adjustModal.isOpen} onClose={adjustModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {adjustType === 'deduct' ? 'Kurangi Saldo' : 'Tambah Saldo'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser && (
              <VStack align="start" spacing={3} mb={4}>
                <Text fontSize="sm" color="gray.600">User: {selectedUser.user_email}</Text>
                <Badge colorScheme="green">Saldo saat ini: {formatCurrency(selectedUser.balance)}</Badge>
              </VStack>
            )}
            <VStack spacing={4}>
              {adjustError && (
                <Alert status="error" w="full">
                  <AlertIcon />
                  <AlertDescription>{adjustError}</AlertDescription>
                </Alert>
              )}
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <Text color="gray.400">Rp</Text>
                </InputLeftElement>
                <Input
                  type="number"
                  placeholder="Masukkan jumlah"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
              </InputGroup>
              <Input
                placeholder="Deskripsi (opsional)"
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button onClick={adjustModal.onClose} variant="ghost">Batal</Button>
              <Button colorScheme={adjustType === 'deduct' ? 'red' : 'green'} onClick={submitAdjust} isLoading={adjustLoading}>
                Konfirmasi
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserBalance;