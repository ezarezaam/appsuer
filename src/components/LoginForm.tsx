import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Alert,
  AlertIcon,
  useColorModeValue
} from '@chakra-ui/react'

interface LoginFormProps {
  onLogin: (email: string, password: string) => void
  error?: string
  isLoading?: boolean
}

export const LoginForm: FC<LoginFormProps> = ({ onLogin, error, isLoading }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const bg = useColorModeValue('white', 'gray.800')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (email && password) {
      onLogin(email, password)
    }
  }

  return (
    <Box maxW="md" mx="auto" mt={8}>
      <Box bg={bg} p={8} rounded="lg" shadow="md">
        <VStack spacing={6}>
          <Heading size="lg" textAlign="center" color="blue.600">
            Admin Wallet Approval
          </Heading>

          {error && (
            <Alert status="error" rounded="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                width="full"
                isLoading={isLoading}
                loadingText="Logging in..."
              >
                Login
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Box>
  )
}