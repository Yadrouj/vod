# VOD (sarvnema) — server deploy runbook

Target host: `ssh ubuntu@185.203.118.87` · Path: `/home/ubuntu/vod` · Domain: `sarvnema.ir`

The edge proxy is the **dockerised** nginx container `mn2-nginx` (network
`infrastructure_default`). The app container joins that network so nginx reaches
it by name. TLS is terminated at the **ArvanCloud CDN** (sarvnema.ir already
resolves to Arvan); this origin serves plain HTTP on port 80, like the other
sites on this host.

## Prerequisites (already done)
- `git-lfs` is installed on the host (needed for the LFS catalog).

## Steps

```bash
# 0) (on your laptop) push main first — the server deploys via git pull
git push origin main

# 1) on the server: clone + LFS pull + build
ssh ubuntu@185.203.118.87
git clone -b main git@github.com:Yadrouj/vod.git /home/ubuntu/vod
cd /home/ubuntu/vod
git lfs install --local && git lfs pull       # deploy.sh also does this

# 2) (optional) create .env.local for the public TMDB key / site URL
cp .env.local.example .env.local && nano .env.local

# 3) build + start
bash deploy/deploy.sh          # == docker compose -f docker-compose.prod.yml up -d --build

# 4) nginx: add the site + reload
sudo cp deploy/nginx/sarvnema.conf.services /opt/infrastructure/nginx/services/sarvnema.conf.services
docker exec mn2-nginx nginx -t && docker exec mn2-nginx nginx -s reload

# 5) point ArvanCloud's origin at this server, then verify
#    (Arvan panel -> sarvnema.ir -> origin/upstream = 185.203.118.87:80, HTTP)
curl -I -H 'Host: sarvnema.ir' http://127.0.0.1        # origin check from the host
curl -I https://sarvnema.ir                            # end-to-end via Arvan

# 6) redeploys later are just:
cd /home/ubuntu/vod && bash deploy/deploy.sh
```

## Notes
- The watch-party uses websockets (`/socket.io/`); the nginx block already sets
  the upgrade headers + long timeouts. If Arvan strips websockets, enable
  websocket/HTTP2 passthrough for the domain in the Arvan panel.
- The catalog JSON is large and LFS-backed — if the site 500s on catalog reads,
  re-run `git lfs pull` (pointer files were checked out instead of real data).
