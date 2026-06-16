import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';

interface WeeklyReportEmailProps {
  merchantName: string;
  totalOrders: number;
  completedOrders: number;
  revenue: number;
  topStaffName: string | null;
  lowStockItems: number;
  startDate: string;
  endDate: string;
}

export const WeeklyReportEmail = ({
  merchantName = "Merchant",
  totalOrders = 0,
  completedOrders = 0,
  revenue = 0,
  topStaffName = "None",
  lowStockItems = 0,
  startDate = "Monday",
  endDate = "Sunday",
}: WeeklyReportEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Weekly Order Tracker Performance Report</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Weekly Performance Report</Heading>
          <Text style={text}>
            Hello {merchantName}, here is your automated weekly summary from {startDate} to {endDate}.
          </Text>

          <Section style={statsSection}>
            <Row>
              <Column style={statColumn}>
                <Text style={statLabel}>New Orders</Text>
                <Text style={statValue}>{totalOrders}</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statLabel}>Completed</Text>
                <Text style={statValue}>{completedOrders}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={statColumn}>
                <Text style={statLabel}>Revenue</Text>
                <Text style={statValue}>GH₵ {revenue.toFixed(2)}</Text>
              </Column>
              <Column style={statColumn}>
                <Text style={statLabel}>Top Staff</Text>
                <Text style={statValue}>{topStaffName || "N/A"}</Text>
              </Column>
            </Row>
          </Section>

          {lowStockItems > 0 && (
            <Section style={alertSection}>
              <Text style={alertText}>
                ⚠️ You have {lowStockItems} inventory items running low on stock. Check your dashboard to replenish.
              </Text>
            </Section>
          )}

          <Hr style={hr} />
          
          <Text style={footer}>
            Powered by Order Tracker &copy; {new Date().getFullYear()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WeeklyReportEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '12px',
  border: '1px solid #e6ebf1',
  maxWidth: '600px',
  marginTop: '40px',
  marginBottom: '40px',
};

const h1 = {
  color: '#191A43',
  fontSize: '24px',
  fontWeight: '800',
  margin: '0 0 20px',
  padding: '0',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'center' as const,
};

const statsSection = {
  marginTop: '32px',
  marginBottom: '32px',
};

const statColumn = {
  padding: '16px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #f1f5f9',
  textAlign: 'center' as const,
  width: '50%',
};

const statLabel = {
  fontSize: '12px',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  fontWeight: 'bold',
  letterSpacing: '0.05em',
  margin: '0 0 4px',
};

const statValue = {
  fontSize: '24px',
  color: '#0f172a',
  fontWeight: '900',
  margin: '0',
};

const alertSection = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '32px',
  border: '1px solid #fee2e2',
};

const alertText = {
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  textAlign: 'center' as const,
};
