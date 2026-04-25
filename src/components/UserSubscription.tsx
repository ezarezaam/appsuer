import { useState, useEffect, useMemo, useCallback } from 'react';
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
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    FormControl,
    FormLabel,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { FaUserTag, FaClock, FaCalendarAlt, FaSort, FaSortUp, FaSortDown, FaEdit, FaPlus, FaSearch } from 'react-icons/fa';

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

interface Plan {
    id: string;
    name: string;
    price: number;
}

interface FoundUser {
    user_id: string;
    full_name: string | null;
    user_email: string | null;
}

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const UserSubscription: FC = () => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('none');
    
    // Edit Modal State
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
    const [editStatus, setEditStatus] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editPlanId, setEditPlanId] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Add Modal State
    const addDisclosure = useDisclosure();
    const [newUserId, setNewUserId] = useState('');
    const [newPlanId, setNewPlanId] = useState('');
    const [newStatus, setNewStatus] = useState('ACTIVE');
    const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [newEndDate, setNewEndDate] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    // User Search for adding
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [foundUsers, setFoundUsers] = useState<FoundUser[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [hasSearchedUsers, setHasSearchedUsers] = useState(false);

    const toast = useToast();

    useEffect(() => {
        if (!addDisclosure.isOpen) return;
        setNewUserId('');
        setUserSearchTerm('');
        setFoundUsers([]);
        setHasSearchedUsers(false);
        setNewStatus('ACTIVE');
        setNewStartDate(new Date().toISOString().split('T')[0]);
        setNewEndDate('');
        if (plans.length > 0) setNewPlanId(plans[0].id);
    }, [addDisclosure.isOpen, plans]);

    const fetchPlans = useCallback(async () => {
        const secret = import.meta.env.VITE_ADMIN_SECRET_KEY;
        if (!secret) {
            return;
        }
        try {
            const response = await fetch(`/api/admin?action=subscription-plans`, {
                headers: {
                    'x-admin-secret': secret
                }
            });
            const data = await response.json();
            if (data.success) {
                setPlans(data.plans || []);
                if (data.plans?.length > 0) {
                    setNewPlanId(data.plans[0].id);
                }
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Gagal mengambil data plan';
            toast({
                title: 'Error',
                description: message,
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        }
    }, [toast]);

    const searchUsers = useCallback(async (term: string, signal?: AbortSignal) => {
        if (!term.trim()) return;
        const secret = import.meta.env.VITE_ADMIN_SECRET_KEY;
        if (!secret) {
            toast({
                title: 'Error',
                description: 'Admin secret belum di-set (VITE_ADMIN_SECRET_KEY)',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        try {
            setIsSearchingUsers(true);
            setHasSearchedUsers(true);
            setFoundUsers([]);
            const url = `/api/admin?action=search-users&query=${encodeURIComponent(term)}`;
            const response = await fetch(url, {
                headers: {
                    'x-admin-secret': secret
                },
                signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setFoundUsers(data.users || []);
            } else {
                throw new Error(data.error || 'Terjadi kesalahan saat mencari user');
            }
        } catch (err: unknown) {
            if (signal?.aborted) return;
            const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat mencari user';
            toast({
                title: 'Error',
                description: message,
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setIsSearchingUsers(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!addDisclosure.isOpen) return;
        const term = userSearchTerm.trim();
        if (term.length < 2) {
            setHasSearchedUsers(false);
            setFoundUsers([]);
            return;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            searchUsers(term, controller.signal);
        }, 400);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [userSearchTerm, addDisclosure.isOpen, searchUsers]);

    const handleAddSubscription = async () => {
        if (!newUserId || !newPlanId || !newStartDate || !newEndDate) {
            toast({
                title: 'Error',
                description: 'Mohon isi semua field yang diperlukan',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        if (!isUuid(newUserId)) {
            toast({
                title: 'Error',
                description: 'User ID harus UUID. Pilih user dari hasil pencarian.',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        try {
            setIsAdding(true);
            const response = await fetch(`/api/admin?action=add-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET_KEY
                },
                body: JSON.stringify({
                    user_id: newUserId,
                    plan_id: newPlanId,
                    status: newStatus,
                    current_period_start: newStartDate,
                    current_period_end: newEndDate
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Berhasil',
                    description: 'Langganan baru berhasil ditambahkan',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                addDisclosure.onClose();
                setNewUserId('');
                setUserSearchTerm('');
                setFoundUsers([]);
                fetchSubscriptions();
            } else {
                throw new Error(data.error || 'Gagal menambahkan langganan');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Gagal menambahkan langganan';
            toast({
                title: 'Add Error',
                description: message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleEditClick = (sub: Subscription) => {
        setSelectedSubscription(sub);
        setEditStatus(String(sub.status || 'ACTIVE').toUpperCase());
        setEditPlanId(sub.plan_id);
        // Format dates for input[type="date"]
        setEditStartDate(sub.current_period_start ? new Date(sub.current_period_start).toISOString().split('T')[0] : '');
        setEditEndDate(sub.current_period_end ? new Date(sub.current_period_end).toISOString().split('T')[0] : '');
        onOpen();
    };

    const handleUpdateSubscription = async () => {
        if (!selectedSubscription) return;

        try {
            setIsUpdating(true);
            const response = await fetch(`/api/admin?action=update-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET_KEY
                },
                body: JSON.stringify({
                    id: selectedSubscription.id,
                    status: editStatus,
                    plan_id: editPlanId,
                    current_period_start: editStartDate,
                    current_period_end: editEndDate
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Berhasil',
                    description: 'Langganan berhasil diperbarui',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                onClose();
                fetchSubscriptions(); // Refresh data
            } else {
                throw new Error(data.error || 'Gagal memperbarui langganan');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Gagal memperbarui langganan';
            toast({
                title: 'Update Error',
                description: message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const fetchSubscriptions = useCallback(async () => {
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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fetch subscriptions';
            setError(message);
            toast({
                title: 'Fetch Error',
                description: message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSubscriptions();
        fetchPlans();
    }, [fetchSubscriptions, fetchPlans]);

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
        switch ((status || '').toLowerCase()) {
            case 'active': return 'green';
            case 'expired': return 'red';
            case 'inactive': return 'red';
            case 'cancelled': return 'gray';
            case 'canceled': return 'gray';
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
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                        <option value="SUSPENDED">SUSPENDED</option>
                                        <option value="EXPIRED">EXPIRED</option>
                                    </Select>
                                    <Button
                                        colorScheme="blue"
                                        onClick={fetchSubscriptions}
                                        isLoading={loading}
                                    >
                                        Refresh
                                    </Button>
                                    <Button
                                        leftIcon={<Icon as={FaPlus} />}
                                        colorScheme="green"
                                        onClick={addDisclosure.onOpen}
                                    >
                                        Tambah Langganan
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
                                            <Th>Aksi</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {processedSubscriptions.length === 0 ? (
                                            <Tr>
                                                <Td colSpan={7} textAlign="center" py={10}>
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
                                                        <Badge colorScheme={getStatusColor(sub.status)}>
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
                                                    <Td>
                                                        <Button
                                                            size="sm"
                                                            leftIcon={<Icon as={FaEdit} />}
                                                            colorScheme="blue"
                                                            variant="ghost"
                                                            onClick={() => handleEditClick(sub)}
                                                        >
                                                            Edit
                                                        </Button>
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

            {/* Edit Subscription Modal */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit Langganan User</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <FormControl>
                                <FormLabel>User</FormLabel>
                                <Text fontWeight="bold">{selectedSubscription?.full_name}</Text>
                                <Text fontSize="sm" color="gray.500">{selectedSubscription?.user_email}</Text>
                            </FormControl>

                            <FormControl>
                                <FormLabel>Status</FormLabel>
                                <Select 
                                    value={editStatus} 
                                    onChange={(e) => setEditStatus(e.target.value)}
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                    <option value="PENDING">PENDING</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                    <option value="SUSPENDED">SUSPENDED</option>
                                    <option value="EXPIRED">EXPIRED</option>
                                </Select>
                            </FormControl>

                            <FormControl>
                                <FormLabel>Plan</FormLabel>
                                <Select 
                                    value={editPlanId} 
                                    onChange={(e) => setEditPlanId(e.target.value)}
                                >
                                    {plans.map(plan => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl>
                                <FormLabel>Start Date</FormLabel>
                                <Input 
                                    type="date" 
                                    value={editStartDate} 
                                    onChange={(e) => setEditStartDate(e.target.value)}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>End Date</FormLabel>
                                <Input 
                                    type="date" 
                                    value={editEndDate} 
                                    onChange={(e) => setEditEndDate(e.target.value)}
                                />
                            </FormControl>
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Batal
                        </Button>
                        <Button 
                            colorScheme="blue" 
                            onClick={handleUpdateSubscription}
                            isLoading={isUpdating}
                        >
                            Simpan Perubahan
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Add Subscription Modal */}
            <Modal isOpen={addDisclosure.isOpen} onClose={addDisclosure.onClose} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Tambah Langganan Baru</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            <FormControl isRequired>
                                <FormLabel>Cari User</FormLabel>
                                <HStack>
                                    <Input 
                                        placeholder="Cari nama, email, atau ID..." 
                                        value={userSearchTerm}
                                        onChange={(e) => setUserSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && searchUsers(userSearchTerm.trim())}
                                    />
                                    <Button 
                                        leftIcon={<Icon as={FaSearch} />} 
                                        onClick={() => searchUsers(userSearchTerm.trim())}
                                        isLoading={isSearchingUsers}
                                    >
                                        Cari
                                    </Button>
                                </HStack>
                            </FormControl>

                            {(isSearchingUsers || foundUsers.length > 0 || hasSearchedUsers) && (
                                <Box borderWidth="1px" borderRadius="md" p={2} bg="gray.50">
                                    <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.500">HASIL PENCARIAN:</Text>
                                    {isSearchingUsers ? (
                                        <Box py={4} textAlign="center">
                                            <Spinner size="sm" mr={2} />
                                            <Text as="span" fontSize="sm" color="gray.600">Mencari user...</Text>
                                        </Box>
                                    ) : foundUsers.length === 0 ? (
                                        <Box py={4} textAlign="center">
                                            <Text fontSize="sm" color="gray.600">Tidak ada user ditemukan</Text>
                                            <Text fontSize="xs" color="gray.500">Ketik minimal 2 karakter (nama/email/ID)</Text>
                                        </Box>
                                    ) : (
                                        <VStack align="stretch" spacing={2}>
                                            {foundUsers.map(user => (
                                                <HStack 
                                                    key={user.user_id} 
                                                    justify="space-between" 
                                                    p={2} 
                                                    bg={newUserId === user.user_id ? "blue.100" : "white"}
                                                    borderRadius="md"
                                                    cursor="pointer"
                                                    onClick={() => setNewUserId(user.user_id)}
                                                    _hover={{ bg: "blue.50" }}
                                                >
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontWeight="bold" fontSize="sm">{user.full_name || '-'}</Text>
                                                        <Text fontSize="xs" color="gray.500">{user.user_email || '-'}</Text>
                                                    </VStack>
                                                    {newUserId === user.user_id && <Badge colorScheme="blue">Terpilih</Badge>}
                                                </HStack>
                                            ))}
                                        </VStack>
                                    )}
                                </Box>
                            )}

                            <FormControl isRequired>
                                <FormLabel>User ID</FormLabel>
                                <Input 
                                    placeholder="ID User terpilih..." 
                                    value={newUserId}
                                    isReadOnly
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Plan</FormLabel>
                                <Select value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)}>
                                    {plans.map(plan => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Status</FormLabel>
                                <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="PENDING">PENDING</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                    <option value="SUSPENDED">SUSPENDED</option>
                                    <option value="EXPIRED">EXPIRED</option>
                                </Select>
                            </FormControl>

                            <HStack spacing={4}>
                                <FormControl isRequired>
                                    <FormLabel>Start Date</FormLabel>
                                    <Input 
                                        type="date" 
                                        value={newStartDate} 
                                        onChange={(e) => setNewStartDate(e.target.value)}
                                    />
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel>End Date</FormLabel>
                                    <Input 
                                        type="date" 
                                        value={newEndDate} 
                                        onChange={(e) => setNewEndDate(e.target.value)}
                                    />
                                </FormControl>
                            </HStack>
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={addDisclosure.onClose}>
                            Batal
                        </Button>
                        <Button 
                            colorScheme="green" 
                            onClick={handleAddSubscription}
                            isLoading={isAdding}
                            leftIcon={<Icon as={FaPlus} />}
                        >
                            Tambah Langganan
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
};

export default UserSubscription;
