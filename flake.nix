{
  description = "Typescript dev env";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/25.05";
    system.url = "github:nix-systems/default";
    devenv.url = "github:cachix/devenv/v1.8";
  };

  outputs = { self, nixpkgs, devenv, systems, ... } @ inputs:
    let
      forEachSystem = nixpkgs.lib.genAttrs (import systems);
    in
    {
      # https://github.com/cachix/devenv/issues/756#issuecomment-1941486375
      packages = forEachSystem (system: {
        devenv-up = self.devShells.${system}.default.config.procfileScript;
      });

      devShells = forEachSystem (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = devenv.lib.mkShell {
            inherit inputs pkgs;
            modules = [
              {
                packages = with pkgs; [
                  bun
                  nodejs_22
                  nodePackages.typescript-language-server
                  tailwindcss-language-server
                ];
              }
            ];
          };
        }
      );
    };
}
