import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, ExternalLink, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadBachs, type Bachs } from '@bachs/js';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { initiateMerchantWalletCheckout } from '../../api/merchant-wallet';
import { checkPaymentStatus, simulateSandboxPayment } from '../../api/wallet';

interface CheckoutState {
  reference: string;
  checkout_url: string;
  amount: number;
  is_simulated: boolean;
}

const MerchantDeposit = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const bachsRef = useRef<Bachs | null>(null);

  useEffect(() => {
    let mounted = true;
    loadBachs({ baseUrl: 'https://sandbox-checkout.bachs.io' })
      .then((bachs) => {
        if (mounted) bachsRef.current = bachs;
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const verifyPayment = async (reference: string) => {
    setVerifying(true);
    try {
      const response = await checkPaymentStatus(reference);
      if (response.data.data.status === 'completed') {
        setAmount(String(response.data.data.amount));
        setSuccess(true);
        setCheckout(null);
        setSearchParams({}, { replace: true });
        toast.success('Payment verified and added to your merchant wallet.');
        return true;
      }
      toast('Payment is still pending. Please check again in a few seconds.', { icon: '⏳' });
      return false;
    } catch {
      toast.error('Could not verify payment. Please try again.');
      return false;
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (searchParams.get('status') === 'success' && reference) {
      void verifyPayment(reference);
    }
    // A redirect back from checkout should be verified once on page load.
  }, []);

  const beginCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value < 100) {
      toast.error('Minimum deposit is ₦100');
      return;
    }

    setLoading(true);
    try {
      const response = await initiateMerchantWalletCheckout(value);
      const session = response.data.data;
      setCheckout({
        reference: session.reference,
        checkout_url: session.checkout_url,
        amount: value,
        is_simulated: session.is_simulated,
      });

      if (!session.is_simulated && session.checkout_url.startsWith('http')) {
        if (bachsRef.current) {
          try {
            await bachsRef.current.Checkout.open({
              checkoutUrl: session.checkout_url,
              onEvent: (checkoutEvent) => {
                if (checkoutEvent.type === 'checkout.completed') verifyPayment(session.reference);
              },
            });
            return;
          } catch {
            // Open the hosted checkout in a new tab if the overlay is unavailable.
          }
        }
        window.open(session.checkout_url, '_blank', 'noopener,noreferrer');
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not start wallet deposit';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const simulatePayment = async () => {
    if (!checkout) return;
    setSimulating(true);
    try {
      await simulateSandboxPayment(checkout.reference);
      setSuccess(true);
      setCheckout(null);
      toast.success('Demo deposit completed and wallet credited.');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Payment simulation failed';
      toast.error(message);
    } finally {
      setSimulating(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-(--success)" />
          <h1 className="mt-4 text-xl font-semibold text-(--text)">Deposit confirmed</h1>
          <p className="mt-2 text-sm text-(--text-secondary)">
            ₦{Number(amount).toLocaleString()} has been added to your merchant wallet.
          </p>
          <Button className="mt-6" onClick={() => navigate('/merchant/wallet')}>
            View merchant wallet
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <Link
        to="/merchant/wallet"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text)"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Merchant Vault
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-(--text)">
        Deposit to Merchant Wallet
      </h1>
      <p className="mt-1 text-sm text-(--text-secondary)">
        Add funds to your business wallet using Bachs checkout.
      </p>

      {checkout ? (
        <Card className="mt-6 space-y-5 p-5">
          <div>
            <p className="text-xs text-(--text-secondary)">Amount</p>
            <p className="font-mono text-2xl font-bold text-(--text)">
              ₦{checkout.amount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-(--text-tertiary)">
              Reference: <code>{checkout.reference}</code>
            </p>
          </div>

          {checkout.is_simulated ? (
            <Button className="w-full" onClick={simulatePayment} loading={simulating}>
              <CheckCircle className="mr-2 h-4 w-4" /> Simulate successful demo payment
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(checkout.checkout_url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Open checkout
              </Button>
              <Button
                className="w-full"
                onClick={() => verifyPayment(checkout.reference)}
                loading={verifying}
              >
                I have paid · Verify payment
              </Button>
            </>
          )}
          <Button variant="outline" className="w-full" onClick={() => setCheckout(null)}>
            Cancel / choose another amount
          </Button>
        </Card>
      ) : (
        <form onSubmit={beginCheckout} className="mt-6 space-y-5">
          <Input
            label="Deposit amount (₦)"
            type="number"
            min={100}
            max={10000000}
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 25000"
            required
          />
          <div className="flex flex-wrap gap-2">
            {[1000, 5000, 10000, 25000, 50000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className="rounded-lg border border-(--border) px-3 py-1.5 font-mono text-xs text-(--text-secondary) hover:border-(--accent-primary)"
              >
                ₦{preset.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-(--border) bg-(--bg-secondary) p-4 text-xs text-(--text-secondary)">
            <p className="flex items-center gap-2 font-medium text-(--text)">
              <CreditCard className="h-4 w-4 text-(--accent-primary)" /> Bachs secure checkout
            </p>
            <p className="mt-1">Deposits are credited after the payment is confirmed.</p>
          </div>
          <Button
            type="submit"
            loading={loading}
            disabled={!amount || Number(amount) < 100}
            className="w-full"
          >
            <CreditCard className="mr-2 h-4 w-4" /> Continue to payment
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-(--text-tertiary)">
            <Shield className="h-3.5 w-3.5 text-(--success)" /> Minimum deposit ₦100 · Maximum
            ₦10,000,000
          </p>
        </form>
      )}
    </div>
  );
};

export default MerchantDeposit;
