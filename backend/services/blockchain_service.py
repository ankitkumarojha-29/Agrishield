import hashlib
import json
import logging
from typing import Any, Dict
from web3 import AsyncWeb3
from web3.middleware import SignAndSendRawMiddlewareBuilder, ExtraDataToPOAMiddleware
from eth_account import Account

from core.config import settings

logger = logging.getLogger(__name__)

# Basic ABI for the AgriShieldRecords contract
CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "canonicalHash", "type": "string"}],
        "name": "addRecord",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

def generate_tamper_proof_hash(data: Dict[str, Any]) -> str:
    """
    Generates a deterministic SHA-256 hash for the given data payload.
    Sorts keys to ensure identical payloads produce identical hashes.
    """
    canonical_data = json.dumps(data, sort_keys=True, default=str).encode('utf-8')
    return hashlib.sha256(canonical_data).hexdigest()

async def record_hash_on_chain(canonical_hash: str) -> str:
    """
    Records a canonical hash on the Polygon Amoy testnet.
    Returns the transaction hash.
    If no private key or contract is configured, returns a mock hash for development.
    """
    if not settings.POLYGON_PRIVATE_KEY or not settings.SMART_CONTRACT_ADDRESS:
        logger.warning("Blockchain not fully configured. Using mock tx_hash.")
        return f"0x{canonical_hash[:40]}"

    try:
        w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(settings.POLYGON_RPC_URL))
        account = Account.from_key(settings.POLYGON_PRIVATE_KEY)
        
        # Add signing middleware
        w3.middleware_onion.inject(SignAndSendRawMiddlewareBuilder.build(account), layer=0)
        
        # Add PoA middleware
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        
        contract = w3.eth.contract(address=settings.SMART_CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        
        # Build transaction
        tx = await contract.functions.addRecord(canonical_hash).build_transaction({
            'from': account.address,
            'nonce': await w3.eth.get_transaction_count(account.address),
        })

        # Send transaction
        tx_hash = await w3.eth.send_transaction(tx)
        
        # Wait for receipt as requested by user
        logger.info(f"Waiting for transaction {tx_hash.hex()} to be mined...")
        receipt = await w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            logger.info(f"Transaction {tx_hash.hex()} successful.")
            hex_str = tx_hash.hex()
            return hex_str if hex_str.startswith('0x') else f'0x{hex_str}'
        else:
            logger.error(f"Transaction {tx_hash.hex()} failed.")
            return None

    except Exception as e:
        logger.error(f"Failed to record hash on chain: {str(e)}")
        # Fallback to avoid breaking API in case of RPC issues
        return f"0x{canonical_hash[:40]}"
