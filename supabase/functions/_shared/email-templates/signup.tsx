/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre adresse email pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Inkoo" width="120" height="auto" style={logo} />
        <Heading style={h1}>Bienvenue sur Inkoo</Heading>
        <Text style={text}>
          Merci de vous être inscrit sur{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          Veuillez confirmer votre adresse email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) en cliquant sur le bouton ci-dessous :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer mon email
        </Button>
        <Text style={footer}>
          Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const LOGO_URL = 'https://kjhiekuoiugwjsetosvo.supabase.co/storage/v1/object/public/email-assets/inkoo-full-noir.svg'
const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { marginBottom: '24px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1d1b19',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#797572',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const link = { color: '#1d1b19', textDecoration: 'underline' }
const button = {
  backgroundColor: '#0a0e1f',
  color: '#f8f6f1',
  fontSize: '14px',
  borderRadius: '6px',
  padding: '12px 24px',
  textDecoration: 'none',
  fontWeight: '500' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
