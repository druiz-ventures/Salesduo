import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, token } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  try {
    // Crear o recuperar cliente en Stripe
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { token: token || '' },
      });
    }

    // Crear Setup Intent (captura tarjeta sin cobrar)
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      metadata: { token: token || '', email },
      automatic_payment_methods: { enabled: true },
    });

    return res.status(200).json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
