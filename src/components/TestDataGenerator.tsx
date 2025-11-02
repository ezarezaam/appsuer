import type { FC } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  Divider,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Icon,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react'
import { FiDatabase, FiCheck } from 'react-icons/fi'
// No database actions here; purely informational component

export const TestDataGenerator: FC = () => {

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