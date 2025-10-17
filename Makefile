deploy-secrets:
	fly secrets import < .env

deploy:
	bun vite build && fly deploy
