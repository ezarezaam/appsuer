import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Button,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Spinner,
  Center,
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
  Textarea,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Image,
  ButtonGroup,
  Heading,
  Flex,
  Spacer,
  IconButton,
  StatHelpText,
  Tooltip
} from '@chakra-ui/react';
import { 
  FiCheck, 
  FiX, 
  FiDollarSign, 
  FiClock, 
  FiRefreshCw,
  FiEye,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';

// Import service untuk data real
import {
  getAllTopupRequests,
  approveTopupRequest,
  rejectTopupRequest,
  getWalletStats,
  testConnection,
  type TopupRequest,
  type WalletStats
} from '../services/realBalanceService';

const WalletApproval: FC = () => {
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [stats, setStats] = useState<WalletStats>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    pendingAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TopupRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const toast = useToast();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isRejectOpen, onOpen: onRejectOpen, onClose: onRejectClose } = useDisclosure();

  // Load data from database
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test connection first
      const connectionTest = await testConnection();
      if (!connectionTest.success) {
        throw new Error('Failed to connect to database');
      }

      // Load requests
      const requestsResult = await getAllTopupRequests();
      if (!requestsResult.success) {
        throw new Error(requestsResult.error?.message || 'Failed to load requests');
      }

      // Load stats
      const statsResult = await getWalletStats();
      if (!statsResult.success) {
        throw new Error(statsResult.error?.message || 'Failed to load stats');
      }

      setRequests(requestsResult.requests || []);
      setStats(statsResult.stats || {
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        pendingAmount: 0
      });

    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load data from database',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      
      const result = await approveTopupRequest(requestId, approvalNotes || 'Approved');
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to approve request');
      }
      
      toast({
        title: "Success",
        description: "Topup request approved successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      setApprovalNotes('');
      onDetailClose();
      loadData();
      
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setActionLoading(requestId);
      
      const result = await rejectTopupRequest(requestId, rejectionReason);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to reject request');
      }
      
      toast({
        title: "Success",
        description: "Request rejected successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      setRejectionReason('');
      onRejectClose();
      onDetailClose();
      loadData();
      
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge colorScheme="yellow" variant="outline"><Icon as={FiClock} mr={1} />Pending</Badge>;
      case 'approved':
        return <Badge colorScheme="green" variant="outline"><Icon as={FiCheck} mr={1} />Approved</Badge>;
      case 'rejected':
        return <Badge colorScheme="red" variant="outline"><Icon as={FiX} mr={1} />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFilteredRequests = () => {
    switch (activeTab) {
      case 0: return requests.filter(r => r.status === 'pending');
      case 1: return requests.filter(r => r.status === 'approved');
      case 2: return requests.filter(r => r.status === 'rejected');
      case 3: return requests;
      default: return requests;
    }
  };

  const filteredRequests = getFilteredRequests();

  if (loading) {
    return (
      <Center h="400px">
        <VStack>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading wallet requests...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="400px">
        <VStack spacing={4}>
          <Icon as={FiAlertCircle} boxSize={12} color="red.400" />
          <Text color="red.500" textAlign="center">{error}</Text>
          <Button onClick={loadData} leftIcon={<Icon as={FiRefreshCw} />}>
            Retry
          </Button>
        </VStack>
      </Center>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Flex align="center">
        <VStack align="start" spacing={1}>
          <Heading size="lg" color="blue.600">
            <Icon as={FiDollarSign} mr={3} />
            Wallet Approval
          </Heading>
          <Text color="gray.600">
            Kelola persetujuan topup dari pengguna EvenOddPro
          </Text>
        </VStack>
        <Spacer />
        <Button leftIcon={<Icon as={FiRefreshCw} />} onClick={loadData} variant="outline">
          Refresh
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pending Requests</StatLabel>
              <StatNumber color="orange.500">
                <Icon as={FiClock} mr={2} />
                {stats.totalPending}
              </StatNumber>
              <StatHelpText>Menunggu persetujuan</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Approved</StatLabel>
              <StatNumber color="green.500">
                <Icon as={FiCheckCircle} mr={2} />
                {stats.totalApproved}
              </StatNumber>
              <StatHelpText>Telah disetujui</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Rejected</StatLabel>
              <StatNumber color="red.500">
                <Icon as={FiXCircle} mr={2} />
                {stats.totalRejected}
              </StatNumber>
              <StatHelpText>Telah ditolak</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pending Amount</StatLabel>
              <StatNumber color="blue.500">
                <Icon as={FiDollarSign} mr={2} />
                Rp {stats.pendingAmount.toLocaleString('id-ID')}
              </StatNumber>
              <StatHelpText>Total nilai pending</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card>
        <CardHeader>
          <Flex align="center">
            <Heading size="md">Topup Requests</Heading>
            <Spacer />
            <Button
              leftIcon={<Icon as={FiRefreshCw} />}
              onClick={loadData}
              isLoading={loading}
              size="sm"
              colorScheme="blue"
              variant="outline"
            >
              Refresh
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>
                <HStack>
                  <Icon as={FiClock} />
                  <Text>Pending ({stats.totalPending})</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiCheckCircle} />
                  <Text>Approved ({stats.totalApproved})</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiXCircle} />
                  <Text>Rejected ({stats.totalRejected})</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiEye} />
                  <Text>All ({requests.length})</Text>
                </HStack>
              </Tab>
            </TabList>
            
            <TabPanels>
              {[0, 1, 2, 3].map(tabIndex => (
                <TabPanel key={tabIndex} px={0}>
                  <TableContainer>
                    <Table variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                          <Th isNumeric>Amount</Th>
                          <Th>Payment Method</Th>
                          <Th>Status</Th>
                          <Th>Date</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredRequests.map((request) => (
                          <Tr key={request.id} _hover={{ bg: "gray.50" }}>
                            <Td>
                              <Text fontWeight="medium" fontSize="sm">
                                {request.user_profile?.full_name || 'Unknown User'}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontSize="sm" color="gray.600">
                                {request.user_profile?.email || 'No email'}
                              </Text>
                            </Td>
                            <Td isNumeric>
                              <Text fontWeight="bold" color="blue.600">
                                {formatCurrency(request.amount)}
                              </Text>
                            </Td>
                            <Td>
                              <Badge colorScheme="blue" variant="subtle">
                                {request.payment_method}
                              </Badge>
                            </Td>
                            <Td>{getStatusBadge(request.status)}</Td>
                            <Td>
                              <Text fontSize="sm" color="gray.600">
                                {formatDate(request.created_at)}
                              </Text>
                            </Td>
                            <Td>
                              <HStack spacing={2}>
                                <Tooltip label="View Details">
                                  <IconButton
                                    aria-label="View details"
                                    icon={<Icon as={FiEye} />}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      onDetailOpen();
                                    }}
                                  />
                                </Tooltip>
                                
                                {request.status === 'pending' && (
                                  <>
                                    <Tooltip label="Approve Request">
                                      <IconButton
                                        aria-label="Approve"
                                        icon={<Icon as={FiCheck} />}
                                        size="sm"
                                        colorScheme="green"
                                        variant="outline"
                                        onClick={() => handleApprove(request.id)}
                                        isLoading={actionLoading === request.id}
                                      />
                                    </Tooltip>
                                    
                                    <Tooltip label="Reject Request">
                                      <IconButton
                                        aria-label="Reject"
                                        icon={<Icon as={FiX} />}
                                        size="sm"
                                        colorScheme="red"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedRequest(request);
                                          onRejectOpen();
                                        }}
                                      />
                                    </Tooltip>
                                  </>
                                )}
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                    
                    {filteredRequests.length === 0 && (
                      <Box textAlign="center" py={10}>
                        <Icon as={FiAlertCircle} boxSize={12} color="gray.300" mb={4} />
                        <Text fontSize="lg" color="gray.500" mb={2}>
                          No {tabIndex === 0 ? 'pending' : tabIndex === 1 ? 'approved' : tabIndex === 2 ? 'rejected' : ''} requests found
                        </Text>
                        <Text color="gray.400">
                          {tabIndex === 0 ? 'All requests have been processed' : 
                           tabIndex === 1 ? 'No approved requests yet' :
                           tabIndex === 2 ? 'No rejected requests yet' :
                           'No topup requests available'}
                        </Text>
                      </Box>
                    )}
                  </TableContainer>
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>

      {/* View Details Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FiEye} color="blue.500" />
              <Text>Detail Permintaan Topup</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRequest && (
              <VStack spacing={6} align="stretch">
                <SimpleGrid columns={2} spacing={6}>
                  <Box>
                    <Text fontWeight="bold" mb={2} color="gray.700">User Information</Text>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">{selectedRequest.user_profile?.full_name || 'Unknown User'}</Text>
                      <Text fontSize="sm" color="gray.500">{selectedRequest.user_profile?.email}</Text>
                    </VStack>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" mb={2} color="gray.700">Amount</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                      {formatCurrency(selectedRequest.amount)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" mb={2} color="gray.700">Payment Method</Text>
                    <Badge colorScheme="blue" variant="subtle" fontSize="sm" px={3} py={1}>
                      {selectedRequest.payment_method}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" mb={2} color="gray.700">Status</Text>
                    {getStatusBadge(selectedRequest.status)}
                  </Box>
                  <Box>
                    <Text fontWeight="bold" mb={2} color="gray.700">Request Date</Text>
                    <Text>{formatDate(selectedRequest.created_at)}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" mb={2} color="gray.700">Last Updated</Text>
                    <Text>{formatDate(selectedRequest.updated_at)}</Text>
                  </Box>
                </SimpleGrid>
                
                {selectedRequest.payment_details && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Payment Details</Text>
                    <Box p={3} bg="gray.50" rounded="md">
                      <pre style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(selectedRequest.payment_details, null, 2)}
                      </pre>
                    </Box>
                  </Box>
                )}
                
                {selectedRequest.payment_proof_url && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Payment Proof</Text>
                    <Image 
                      src={selectedRequest.payment_proof_url} 
                      alt="Payment Proof" 
                      maxW="100%" 
                      h="auto" 
                      rounded="md" 
                      border="1px solid" 
                      borderColor="gray.200"
                    />
                  </Box>
                )}
                
                {selectedRequest.status === 'pending' && (
                  <FormControl>
                    <FormLabel>Approval Notes (Optional)</FormLabel>
                    <Textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add notes for approval..."
                    />
                  </FormControl>
                )}
                
                {selectedRequest.admin_notes && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Admin Notes</Text>
                    <Box p={3} bg="gray.50" rounded="md">
                      <Text>{selectedRequest.admin_notes}</Text>
                    </Box>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            {selectedRequest?.status === 'pending' && (
              <ButtonGroup spacing={3}>
                <Button
                  leftIcon={<Icon as={FiX} />}
                  colorScheme="red"
                  variant="outline"
                  onClick={() => onRejectOpen()}
                >
                  Reject
                </Button>
                <Button
                  leftIcon={<Icon as={FiCheck} />}
                  colorScheme="green"
                  onClick={() => selectedRequest && handleApprove(selectedRequest.id)}
                  isLoading={actionLoading === selectedRequest?.id}
                >
                  Approve
                </Button>
              </ButtonGroup>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={isRejectOpen} onClose={onRejectClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FiX} color="red.500" />
              <Text>Tolak Permintaan Topup</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRequest && (
              <VStack spacing={4} align="stretch">
                <Box p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200">
                  <HStack spacing={3}>
                    <Icon as={FiAlertCircle} color="red.500" />
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium" color="red.700">
                        Anda akan menolak permintaan topup ini
                      </Text>
                      <Text fontSize="sm" color="red.600">
                        {selectedRequest.user_profile?.full_name} - {formatCurrency(selectedRequest.amount)}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
                
                <FormControl isRequired>
                  <FormLabel>Alasan Penolakan</FormLabel>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Berikan alasan mengapa permintaan ini ditolak..."
                    rows={4}
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <ButtonGroup spacing={3}>
              <Button variant="outline" onClick={onRejectClose}>
                Cancel
              </Button>
              <Button
                leftIcon={<Icon as={FiX} />}
                colorScheme="red"
                onClick={() => selectedRequest && handleReject(selectedRequest.id)}
                isLoading={actionLoading === selectedRequest?.id}
                isDisabled={!rejectionReason.trim()}
              >
                Reject
              </Button>
            </ButtonGroup>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default WalletApproval;