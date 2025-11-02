import React, { useState } from 'react'
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  useToast,
  Alert,
  AlertIcon,
  Divider,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Icon,
  Badge,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react'
import { FiDatabase, FiTrash2, FiPlus, FiCheck } from 'react-icons/fi'
import { supabase } from '../lib/supabase'

export const TestDataGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const toast = useToast()

  const sampleRequests = [
    {
      user_id: '11111111-1111-1111-1111-111111111111',
      wallet_address: 'john.doe@paypal.com',
      wallet_type: 'paypal',
      status: 'pending'
    },
    {
      user_id: '22222222-2222-2222-2222-222222222222',
      wallet_address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      wallet_type: 'crypto',
      status: 'pending'
    },
    {
      user_id: '33333333-3333-3333-3333-333333333333',
      wallet_address: 'Bank BCA - 1234567890 - Jane Smith',
      wallet_type: 'bank',
      status: 'approved'
    },
    {
      user_id: '44444444-4444-4444-4444-444444444444',
      wallet_address: 'alice.crypto@gmail.com',
      wallet_type: 'paypal',
      status: 'rejected'
    }
  ]

  const generateTestData = async () => {
    setIsGenerating(true)
    try {
      // First, create sample users
      const sampleUsers = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'john.doe@example.com',
          full_name: 'John Doe'
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          email: 'crypto.user@example.com',
          full_name: 'Crypto User'
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          email: 'jane.smith@example.com',
          full_name: 'Jane Smith'
        },
        {
          id: '44444444-4444-4444-4444-444444444444',
          email: 'alice.crypto@example.com',
          full_name: 'Alice Crypto'
        }
      ]

      // Insert sample users (ignore if they already exist)
      for (const user of sampleUsers) {
        await supabase
          .from('users')
          .upsert(user, { onConflict: 'id' })
      }

      // Insert sample user profiles
      const sampleProfiles = sampleUsers.map(user => ({
        id: user.id,
        full_name: user.full_name,
        phone: `+628${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.full_name.replace(' ', '')}`
      }))

      await supabase
        .from('user_profiles')
        .upsert(sampleProfiles, { onConflict: 'id' })

      // Insert sample user balances
      const sampleBalances = sampleUsers.map(user => ({
        user_id: user.id,
        balance: Math.floor(Math.random() * 1000000) + 50000, // Random balance between 50k - 1M
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      await supabase
        .from('user_balance')
        .upsert(sampleBalances, { onConflict: 'user_id' })

      // Insert sample wallet requests
      const { data, error } = await supabase
        .from('wallet_requests')
        .insert(sampleRequests)

      if (error) throw error

      toast({
        title: 'Test Data Generated',
        description: `Successfully created ${sampleRequests.length} wallet requests and ${sampleUsers.length} user balances`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate test data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const clearTestData = async () => {
    setIsGenerating(true)
    try {
      const testUserIds = [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444'
      ]

      // Clear wallet requests
      await supabase
        .from('wallet_requests')
        .delete()
        .in('user_id', testUserIds)

      // Clear user balances
      await supabase
        .from('user_balance')
        .delete()
        .in('user_id', testUserIds)

      // Clear user profiles
      await supabase
        .from('user_profiles')
        .delete()
        .in('id', testUserIds)

      toast({
        title: 'Test Data Cleared',
        description: 'Successfully removed all test data (wallet requests, user balances, and profiles)',
        status: 'info',
        duration: 3000,
        isClosable: true,
      })

    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to clear test data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <VStack spacing={6} align="stretch">
      <Card>
        <CardHeader>
          <HStack>
            <Icon as={FiDatabase} color="blue.500" />
            <Heading size="md" color="blue.600">Test Data Generator</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontWeight="medium">Data Source Information</Text>
                <Text fontSize="sm">
                  Data user balance dan profile diambil dari aplikasi <strong>EvenOddPro Web 2.2</strong>. 
                  Admin panel ini hanya untuk mengelola data yang sudah ada, bukan untuk generate test data.
                  <br /><br />
                  <Text as="span" fontWeight="medium">Note:</Text> Jika Anda perlu data sample untuk testing, 
                  silakan gunakan aplikasi EvenOddPro Web 2.2 untuk membuat user dan balance.
                </Text>
              </Box>
            </Alert>

            <Divider />

            <Box>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Data yang tersedia di admin panel:
              </Text>
              <List spacing={2}>
                <ListItem>
                  <ListIcon as={FiCheck} color="green.500" />
                  <Text as="span" fontWeight="medium">User Balance:</Text> Data saldo pengguna dari EvenOddPro Web 2.2
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheck} color="green.500" />
                  <Text as="span" fontWeight="medium">User Profiles:</Text> Data profil pengguna dari EvenOddPro Web 2.2
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheck} color="green.500" />
                  <Text as="span" fontWeight="medium">Wallet Requests:</Text> Permintaan top-up dari pengguna EvenOddPro
                </ListItem>
              </List>
            </Box>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  )
}