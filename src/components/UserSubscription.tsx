import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
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
    InputGroup,
    InputLeftElement,
    Input,
    Icon,
    Card,
    CardBody,
    CardHeader,
    Heading,
    TableContainer,
    useToast,
    Select,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FaUserTag, FaClock, FaCalendarAlt, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

interface Subscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    created_at: string;
    updated_at: string;
    user_email?: string;
    full_name?: string;
}

const UserSubscription: FC = () => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('none');

    const toast = useToast();

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/admin?action=subscriptions`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET_KEY
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setSubscriptions(data.subscriptions || []);
            } else {
                throw new Error(data.error || 'Failed to fetch subscriptions');
            }
        } catch (err: any) {
            console.error('Error fetching subscriptions:', err);
            setError(err.message || 'Failed to fetch subscriptions');
            toast({
                title: 'Fetch Error',
                description: err.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateRemainingDays = (endDate: string | null) => {
        if (!endDate) return 0;
        const now = new Date();
        const end = new Date(endDate);
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'green';
            case 'expired': return 'red';
            case 'cancelled': return 'gray';
            case 'pending': return 'orange';
            default: return 'gray';
        }
    };

    const processedSubscriptions = useMemo(() => {
        // 1. Filter
        const filtered = subscriptions.filter(sub => {
            const matchesSearch =
                sub.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sub.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sub.plan_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sub.user_id.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || sub.status.toLowerCase() === statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;
        });

        // 2. Map with remaining days for sorting
        const withDays = filtered.map(sub => ({
            ...sub,
            daysLeft: calculateRemainingDays(sub.current_period_end)
        }));

        // 3. Sort
        if (sortDirection !== 'none') {
            withDays.sort((a, b) => {
                if (sortDirection === 'asc') return a.daysLeft - b.daysLeft;
                return b.daysLeft - a.daysLeft;
            });
        }

        return withDays;
    }, [subscriptions, searchTerm, statusFilter, sortDirection]);

    const handleSort = () => {
        if (sortDirection === 'none') setSortDirection('asc');
        else if (sortDirection === 'asc') setSortDirection('desc');
        else setSortDirection('none');
    };

    const getSortIcon = () => {
        if (sortDirection === 'asc') return <FaSortUp />;
        if (sortDirection === 'desc') return <FaSortDown />;
        return <FaSort />;
    };

    return (
        <Box p={4} w="full" maxW="none">
            <VStack spacing={4} align="stretch" w="full">
                <Box>
                    <Heading size="lg" mb={2} color="blue.600">
                        <Icon as={FaUserTag} mr={3} />
                        User Subscription Management
                    </Heading>
                    <Text color="gray.600">
                        Monitor dan kelola langganan paket pengguna EvenOddPro
                    </Text>
                </Box>

                <Card>
                    <CardBody>
                        <VStack align="stretch" spacing={4}>
                            <HStack spacing={4} justify="space-between">
                                <HStack spacing={4} flex={1}>
                                    <InputGroup maxW="400px">
                                        <InputLeftElement pointerEvents="none">
                                            <SearchIcon color="gray.300" />
                                        </InputLeftElement>
                                        <Input
                                            placeholder="Cari nama, email, plan, atau user ID..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </InputGroup>
                                    <Select
                                        maxW="200px"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="all">Semua Status</option>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                        <option value="pending">Pending</option>
                                        <option value="cancelled">Cancelled</option>
                                    </Select>
                                    <Button
                                        colorScheme="blue"
                                        onClick={fetchSubscriptions}
                                        isLoading={loading}
                                    >
                                        Refresh
                                    </Button>
                                </HStack>
                                <Box bg="blue.50" px={4} py={2} borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
                                    <Text fontWeight="bold" color="blue.700">
                                        Total: {processedSubscriptions.length} User
                                    </Text>
                                </Box>
                            </HStack>
                        </VStack>
                    </CardBody>
                </Card>

                {loading ? (
                    <Box textAlign="center" py={10}>
                        <Spinner size="xl" color="blue.500" />
                        <Text mt={4} color="gray.600">Loading subscription data...</Text>
                    </Box>
                ) : error ? (
                    <Alert status="error">
                        <AlertIcon />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : (
                    <Card>
                        <CardHeader pb={0}>
                            <Heading size="md">Daftar Langganan</Heading>
                        </CardHeader>
                        <CardBody>
                            <TableContainer>
                                <Table variant="simple">
                                    <Thead bg="gray.50">
                                        <Tr>
                                            <Th>User ID</Th>
                                            <Th>User Information</Th>
                                            <Th>Plan ID</Th>
                                            <Th>Status</Th>
                                            <Th>Start & End Dates</Th>
                                            <Th
                                                isNumeric
                                                cursor="pointer"
                                                onClick={handleSort}
                                                _hover={{ bg: 'gray.100' }}
                                                transition="background 0.2s"
                                            >
                                                <HStack justify="flex-end" spacing={1}>
                                                    <Text>Remaining Days</Text>
                                                    <Icon as={sortDirection === 'none' ? FaSort : sortDirection === 'asc' ? FaSortUp : FaSortDown} />
                                                </HStack>
                                            </Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {processedSubscriptions.length === 0 ? (
                                            <Tr>
                                                <Td colSpan={6} textAlign="center" py={10}>
                                                    <Text color="gray.500">Tidak ada data langganan yang ditemukan</Text>
                                                </Td>
                                            </Tr>
                                        ) : (
                                            processedSubscriptions.map((sub) => (
                                                <Tr key={sub.id} _hover={{ bg: 'gray.50' }}>
                                                    <Td>
                                                        <Text fontSize="xs" fontFamily="mono" color="gray.600">
                                                            {sub.user_id}
                                                        </Text>
                                                    </Td>
                                                    <Td>
                                                        <VStack align="start" spacing={0}>
                                                            <Text fontWeight="bold" fontSize="sm">{sub.full_name}</Text>
                                                            <Text fontSize="xs" color="gray.500">{sub.user_email}</Text>
                                                        </VStack>
                                                    </Td>
                                                    <Td>
                                                        <Badge variant="outline" colorScheme="blue">
                                                            {sub.plan_id}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        <Badge colorScheme={getStatusColor(sub.status.toLowerCase())}>
                                                            {sub.status}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        <VStack align="start" spacing={1}>
                                                            <HStack spacing={2}>
                                                                <Icon as={FaCalendarAlt} fontSize="xs" color="gray.400" />
                                                                <Text fontSize="xs">Start: {formatDate(sub.current_period_start)}</Text>
                                                            </HStack>
                                                            <HStack spacing={2}>
                                                                <Icon as={FaCalendarAlt} fontSize="xs" color="red.400" />
                                                                <Text fontSize="xs">End: {formatDate(sub.current_period_end)}</Text>
                                                            </HStack>
                                                        </VStack>
                                                    </Td>
                                                    <Td isNumeric>
                                                        <HStack justify="flex-end" spacing={2}>
                                                            <Icon as={FaClock} color={sub.daysLeft < 7 ? 'red.500' : 'green.500'} />
                                                            <Text fontWeight="bold">
                                                                {sub.daysLeft} Hari
                                                            </Text>
                                                        </HStack>
                                                    </Td>
                                                </Tr>
                                            ))
                                        )}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        </CardBody>
                    </Card>
                )}
            </VStack>
        </Box>
    );
};

export default UserSubscription;
