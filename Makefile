.PHONY: deploy

deploy:
	@if [ -z "$(url)" ] || [ -z "$(username)" ] || [ -z "$(password)" ]; then \
		echo "Usage: make deploy url=<URL> username=<USERNAME> password=<PASSWORD>"; \
		exit 1; \
	fi
	cd app && rc-apps deploy --url $(url) --username $(username) --password $(password)
