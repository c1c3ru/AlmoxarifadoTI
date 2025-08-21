import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmNGY2ZjgiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiPjwvY2lyY2xlPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200/30 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-32 right-32 w-40 h-40 bg-purple-200/30 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute top-1/2 left-10 w-20 h-20 bg-indigo-200/30 rounded-full blur-lg animate-bounce"></div>

      <Card className="w-full max-w-lg mx-4 bg-white/80 backdrop-blur-lg border-0 shadow-2xl relative z-10">
        <CardContent className="p-12 text-center">
          {/* 404 Large Number */}
          <div className="relative mb-8">
            <div className="text-8xl font-black bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent select-none">
              404
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-lg opacity-20"></div>
          </div>

          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <i className="fa-solid fa-exclamation-triangle text-white text-2xl animate-pulse"></i>
          </div>

          {/* Title and Description */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Página Não Encontrada
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Oops! A página que você está procurando não existe.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Pode ter sido movida, renomeada ou você digitou o endereço incorretamente.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">
                <i className="fa-solid fa-home mr-2"></i>
                Voltar ao Dashboard
              </Button>
            </Link>
            <Button 
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i>
              Página Anterior
            </Button>
          </div>

          {/* Footer Message */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 flex items-center justify-center">
              <i className="fa-solid fa-code mr-2"></i>
              SGAT-TI - Sistema de Gestão de Almoxarifado de T.I.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
    </div>
  );
}