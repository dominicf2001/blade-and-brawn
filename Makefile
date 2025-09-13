deploy-secrets:
	fly secrets import < .env

sync-products:
	curl -X POST https://blade-and-brawn.fly.dev/products/sync

