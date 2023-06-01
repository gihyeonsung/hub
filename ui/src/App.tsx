import { Center, Progress, Radio, RadioGroup, Stack } from '@chakra-ui/react'
import {
  ChakraProvider,
  Box,
  theme,
} from "@chakra-ui/react"

export const App = () => (
  <ChakraProvider theme={theme}>
    <Center>
      <Box minW="60%" margin="5">
        <Progress colorScheme='green' size='lg' value={20} />
      </Box>
    </Center>
  </ChakraProvider>
)
