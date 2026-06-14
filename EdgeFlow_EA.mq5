//+------------------------------------------------------------------+
//|                                                   EdgeFlow_EA.mq5|
//|                                    Stratégie IMB/FVG + Liquidity  |
//|                                    Instrument : XAUUSD            |
//|                                    TF : M5 (IMB) + M1 (Entrée)   |
//+------------------------------------------------------------------+
#property copyright "EdgeFlow"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\SymbolInfo.mqh>

//+------------------------------------------------------------------+
//| PARAMÈTRES EXTERNES                                              |
//+------------------------------------------------------------------+
input double   RiskPercent      = 1.0;    // Risque par trade (%)
input double   RR               = 2.0;    // Risk/Reward ratio
input int      BufferSL         = 10;     // Buffer Stop Loss (points)
input int      MaxSpread        = 30;     // Spread maximum autorisé (points)
input int      MagicNumber      = 202401; // Magic Number
input bool     EnableBuy        = false;  // Activer les positions BUY
input bool     EnableSell       = true;   // Activer les positions SELL
input int      TradingStartHour = 7;      // Heure de début de trading
input int      TradingEndHour   = 20;     // Heure de fin de trading
input int      LookbackBarsM5   = 50;     // Nombre de barres M5 à analyser
input int      LookbackBarsM1   = 20;     // Nombre de barres M1 à analyser
input int      IMBMinSizePts    = 50;     // Taille minimale de l'IMB (points)
input int      MaxIMBAge        = 20;     // Âge max de l'IMB en barres M5

//+------------------------------------------------------------------+
//| STRUCTURES                                                        |
//+------------------------------------------------------------------+

// Structure représentant un IMB/FVG
struct IMBZone
{
   double   high;         // Haut de la zone
   double   low;          // Bas de la zone
   datetime time;         // Date de création
   bool     isBearish;    // true = bearish, false = bullish
   bool     isValid;      // Zone encore active
   int      barIndex;     // Index de la bougie M5 de création
};

// Structure pour le swing high identifié dans l'IMB
struct SwingHigh
{
   double   price;        // Prix du sommet
   datetime time;         // Date du sommet
   int      barIndex;     // Index de la bougie M1
   bool     isValid;
};

//+------------------------------------------------------------------+
//| VARIABLES GLOBALES                                               |
//+------------------------------------------------------------------+
CTrade         trade;
CPositionInfo  posInfo;
CSymbolInfo    symInfo;

IMBZone        g_imb;            // IMB baissier actif
SwingHigh      g_swingHigh;      // Dernier swing high dans l'IMB
bool           g_sweepDone;      // Sweep de liquidité validé
bool           g_awaitingConfirm;// En attente de confirmation bearish M1
double         g_sweepHigh;      // Plus haut du sweep
datetime       g_sweepTime;      // Heure du sweep

// Handles des séries de prix
int g_m5Bars = 0;
int g_m1Bars = 0;

//+------------------------------------------------------------------+
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
{
   if(_Symbol != "XAUUSD")
   {
      Print("ERREUR : Cet EA est conçu pour XAUUSD uniquement.");
      return INIT_FAILED;
   }

   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(20);
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   ResetState();

   Print("EdgeFlow EA initialisé. MagicNumber=", MagicNumber,
         " | Risk=", RiskPercent, "% | RR=", RR);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| OnDeinit                                                         |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("EdgeFlow EA désactivé. Raison : ", reason);
}

//+------------------------------------------------------------------+
//| OnTick - Point d'entrée principal                                |
//+------------------------------------------------------------------+
void OnTick()
{
   // Filtre : vérifier les conditions générales
   if(!IsTradeAllowed()) return;
   if(IsPositionOpen())  return;
   if(!IsWithinTradingHours()) return;
   if(GetCurrentSpread() > MaxSpread) return;

   // Étape 1 : Détecter ou maintenir l'IMB M5
   if(!g_imb.isValid)
   {
      ScanIMBM5();
   }

   if(!g_imb.isValid) return;

   // Étape 2 : Identifier le swing high dans l'IMB (si pas encore fait)
   if(!g_swingHigh.isValid && !g_sweepDone)
   {
      FindSwingHighInIMB();
   }

   if(!g_swingHigh.isValid && !g_sweepDone) return;

   // Étape 3 : Détecter le sweep de liquidité en M1
   if(!g_sweepDone)
   {
      DetectLiquiditySweep();
   }

   // Étape 4 : Attendre confirmation bearish M1
   if(g_sweepDone && !g_awaitingConfirm)
   {
      g_awaitingConfirm = true;
   }

   if(g_sweepDone && g_awaitingConfirm)
   {
      if(CheckBearishConfirmationM1())
      {
         ExecuteSell();
      }
   }
}

//+------------------------------------------------------------------+
//| Réinitialisation de l'état du bot                                |
//+------------------------------------------------------------------+
void ResetState()
{
   g_imb.isValid       = false;
   g_swingHigh.isValid = false;
   g_sweepDone         = false;
   g_awaitingConfirm   = false;
   g_sweepHigh         = 0.0;
   g_sweepTime         = 0;
}

//+------------------------------------------------------------------+
//| DÉTECTION DES IMB/FVG EN M5                                      |
//| Un IMB baissier se forme quand :                                 |
//| High[i+2] < Low[i] → gap entre la bougie i+2 et la bougie i     |
//+------------------------------------------------------------------+
void ScanIMBM5()
{
   int barsToCheck = MathMin(LookbackBarsM5, iBars(_Symbol, PERIOD_M5) - 3);

   for(int i = 1; i <= barsToCheck; i++)
   {
      double highI2 = iHigh(_Symbol, PERIOD_M5, i + 2);
      double lowI   = iLow(_Symbol, PERIOD_M5, i);
      double highI  = iHigh(_Symbol, PERIOD_M5, i);
      double lowI2  = iLow(_Symbol, PERIOD_M5, i + 2);

      // IMB Baissier : le high de la bougie i+2 est sous le low de la bougie i
      if(EnableSell && highI2 < lowI)
      {
         double imbSize = (lowI - highI2) / _Point;
         if(imbSize >= IMBMinSizePts)
         {
            g_imb.high     = lowI;      // Bas de la bougie i = haut de la zone IMB
            g_imb.low      = highI2;    // Haut de i+2 = bas de la zone IMB
            g_imb.time     = iTime(_Symbol, PERIOD_M5, i);
            g_imb.isBearish = true;
            g_imb.isValid  = true;
            g_imb.barIndex = i;

            Print("IMB Baissier détecté | Haut=", g_imb.high,
                  " | Bas=", g_imb.low,
                  " | Taille=", imbSize, " pts",
                  " | Time=", TimeToString(g_imb.time));
            return;
         }
      }
   }
}

//+------------------------------------------------------------------+
//| IDENTIFICATION DU SWING HIGH DANS LA ZONE IMB                   |
//+------------------------------------------------------------------+
void FindSwingHighInIMB()
{
   int barsM1 = MathMin(LookbackBarsM1 * 5, iBars(_Symbol, PERIOD_M1) - 3);

   double bestHigh  = 0.0;
   int    bestIndex = -1;
   datetime bestTime = 0;

   for(int i = 1; i < barsM1; i++)
   {
      double h = iHigh(_Symbol, PERIOD_M1, i);

      // Le swing high doit être dans la zone IMB ou la toucher
      if(h >= g_imb.low && h <= g_imb.high)
      {
         // Chercher le plus récent swing high valide (pivot local)
         double prevH = iHigh(_Symbol, PERIOD_M1, i + 1);
         double nextH = iHigh(_Symbol, PERIOD_M1, i - 1);

         if(h > prevH && h > nextH)
         {
            if(bestIndex == -1 || i < bestIndex)
            {
               bestHigh  = h;
               bestIndex = i;
               bestTime  = iTime(_Symbol, PERIOD_M1, i);
            }
         }
      }
   }

   if(bestIndex > 0)
   {
      g_swingHigh.price    = bestHigh;
      g_swingHigh.time     = bestTime;
      g_swingHigh.barIndex = bestIndex;
      g_swingHigh.isValid  = true;

      Print("Swing High identifié dans l'IMB | Prix=", g_swingHigh.price,
            " | Time=", TimeToString(g_swingHigh.time));
   }
}

//+------------------------------------------------------------------+
//| DÉTECTION DU SWEEP DE LIQUIDITÉ EN M1                            |
//| Le prix dépasse le swing high puis montre un rejet               |
//+------------------------------------------------------------------+
void DetectLiquiditySweep()
{
   if(!g_swingHigh.isValid) return;

   // Bougie M1 actuelle (index 1 = dernière bougie fermée)
   double highLast  = iHigh(_Symbol, PERIOD_M1, 1);
   double closeLast = iClose(_Symbol, PERIOD_M1, 1);
   double openLast  = iOpen(_Symbol, PERIOD_M1, 1);
   double lowLast   = iLow(_Symbol, PERIOD_M1, 1);

   // Condition de sweep : la bougie a dépassé le swing high ET clôture en dessous
   if(highLast > g_swingHigh.price && closeLast < g_swingHigh.price)
   {
      g_sweepDone  = true;
      g_sweepHigh  = highLast;
      g_sweepTime  = iTime(_Symbol, PERIOD_M1, 1);

      Print("SWEEP DE LIQUIDITÉ VALIDÉ | Sweep High=", g_sweepHigh,
            " | Close=", closeLast,
            " | Time=", TimeToString(g_sweepTime));
   }
}

//+------------------------------------------------------------------+
//| CONFIRMATION BEARISH EN M1                                        |
//| Options :                                                         |
//| 1. Engulfing bearish                                              |
//| 2. Clôture sous le plus bas de la bougie de sweep                |
//| 3. Break of Structure baissier                                    |
//+------------------------------------------------------------------+
bool CheckBearishConfirmationM1()
{
   // Attendre une nouvelle bougie après le sweep
   datetime currentBarTime = iTime(_Symbol, PERIOD_M1, 0);
   if(currentBarTime <= g_sweepTime) return false;

   // Bougie de confirmation (index 1)
   double confirmOpen  = iOpen(_Symbol, PERIOD_M1, 1);
   double confirmClose = iClose(_Symbol, PERIOD_M1, 1);
   double confirmHigh  = iHigh(_Symbol, PERIOD_M1, 1);
   double confirmLow   = iLow(_Symbol, PERIOD_M1, 1);

   // Bougie précédente (index 2) pour l'engulfing
   double prevOpen  = iOpen(_Symbol, PERIOD_M1, 2);
   double prevClose = iClose(_Symbol, PERIOD_M1, 2);
   double prevLow   = iLow(_Symbol, PERIOD_M1, 2);

   // La bougie de confirmation doit être bearish
   if(confirmClose >= confirmOpen) return false;

   // Option 1 : Engulfing bearish
   bool isEngulfing = (confirmOpen >= prevClose && confirmClose <= prevOpen
                       && confirmOpen > confirmClose);

   // Option 2 : Clôture sous le bas de la bougie de sweep
   double sweepLow = iLow(_Symbol, PERIOD_M1, 1);
   // On cherche le low de la bougie du sweep
   double actualSweepLow = 0;
   for(int i = 1; i <= LookbackBarsM1; i++)
   {
      if(iTime(_Symbol, PERIOD_M1, i) == g_sweepTime)
      {
         actualSweepLow = iLow(_Symbol, PERIOD_M1, i);
         break;
      }
   }
   bool closedBelowSweepLow = (actualSweepLow > 0 && confirmClose < actualSweepLow);

   // Option 3 : BOS - clôture sous le bas de la bougie précédente (structure cassée)
   bool isBOS = (confirmClose < prevLow);

   if(isEngulfing || closedBelowSweepLow || isBOS)
   {
      string reason = isEngulfing ? "Engulfing Bearish" :
                      closedBelowSweepLow ? "Close sous Sweep Low" : "Break of Structure";
      Print("CONFIRMATION BEARISH | Raison=", reason,
            " | Close=", confirmClose);
      return true;
   }

   return false;
}

//+------------------------------------------------------------------+
//| EXÉCUTION DE LA POSITION SELL                                    |
//+------------------------------------------------------------------+
void ExecuteSell()
{
   if(!EnableSell) return;

   double ask   = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid   = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double point = _Point;

   // Stop Loss : au-dessus du plus haut du sweep + buffer
   double sl = g_sweepHigh + BufferSL * point;

   // Take Profit : entrée - (sl - entrée) * RR
   double entry   = bid;
   double slDist  = sl - entry;
   double tp      = entry - slDist * RR;

   // Calcul du lot
   double lotSize = CalculateLotSize(slDist);
   if(lotSize <= 0) return;

   // Normalisation
   sl = NormalizeDouble(sl, _Digits);
   tp = NormalizeDouble(tp, _Digits);
   lotSize = NormalizeLot(lotSize);

   // Vérification des niveaux
   if(sl <= bid)
   {
      Print("ERREUR : SL invalide (", sl, " <= bid ", bid, ")");
      ResetState();
      return;
   }

   if(tp >= bid)
   {
      Print("ERREUR : TP invalide (", tp, " >= bid ", bid, ")");
      ResetState();
      return;
   }

   string comment = StringFormat("EdgeFlow|SELL|IMB%.5f-%.5f|SH%.5f",
                                  g_imb.low, g_imb.high, g_sweepHigh);

   bool result = trade.Sell(lotSize, _Symbol, bid, sl, tp, comment);

   if(result)
   {
      Print("SELL ouvert | Lot=", lotSize,
            " | Entry=", bid,
            " | SL=", sl,
            " | TP=", tp,
            " | RR=", RR);
      ResetState();
   }
   else
   {
      Print("ERREUR ouverture SELL | Code=", trade.ResultRetcode(),
            " | ", trade.ResultComment());
      ResetState();
   }
}

//+------------------------------------------------------------------+
//| CALCUL DE LA TAILLE DE LOT                                       |
//+------------------------------------------------------------------+
double CalculateLotSize(double slDistancePrice)
{
   if(slDistancePrice <= 0) return 0;

   double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmount     = accountBalance * RiskPercent / 100.0;

   // Valeur pip pour 1 lot
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);

   if(tickSize == 0 || tickValue == 0) return 0;

   double slTicks    = slDistancePrice / tickSize;
   double lotSize    = riskAmount / (slTicks * tickValue);

   // Normalisation selon les limites du broker
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   lotSize = MathMax(minLot, MathMin(maxLot, lotSize));

   return lotSize;
}

//+------------------------------------------------------------------+
//| NORMALISATION DU LOT                                             |
//+------------------------------------------------------------------+
double NormalizeLot(double lot)
{
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(step == 0) return lot;
   return MathFloor(lot / step) * step;
}

//+------------------------------------------------------------------+
//| VÉRIFICATION : POSITION DÉJÀ OUVERTE                            |
//+------------------------------------------------------------------+
bool IsPositionOpen()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(posInfo.SelectByIndex(i))
      {
         if(posInfo.Symbol() == _Symbol && posInfo.Magic() == MagicNumber)
            return true;
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//| VÉRIFICATION : DANS LES HORAIRES DE TRADING                     |
//+------------------------------------------------------------------+
bool IsWithinTradingHours()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int hour = dt.hour;
   return (hour >= TradingStartHour && hour < TradingEndHour);
}

//+------------------------------------------------------------------+
//| RÉCUPÉRATION DU SPREAD ACTUEL                                    |
//+------------------------------------------------------------------+
int GetCurrentSpread()
{
   return (int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
}

//+------------------------------------------------------------------+
//| VÉRIFICATION DES CONDITIONS DE TRADING                          |
//+------------------------------------------------------------------+
bool IsTradeAllowed()
{
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
   {
      static datetime lastWarn = 0;
      if(TimeCurrent() - lastWarn > 300)
      {
         Print("Trading non autorisé par le terminal.");
         lastWarn = TimeCurrent();
      }
      return false;
   }
   if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
   {
      static datetime lastWarn2 = 0;
      if(TimeCurrent() - lastWarn2 > 300)
      {
         Print("Trading non autorisé pour cet EA (vérifier les paramètres).");
         lastWarn2 = TimeCurrent();
      }
      return false;
   }
   return true;
}

//+------------------------------------------------------------------+
//| OnChartEvent - Gestion des événements (optionnel)               |
//+------------------------------------------------------------------+
void OnChartEvent(const int id, const long &lparam,
                  const double &dparam, const string &sparam)
{
   // Réservé pour extensions futures (boutons, dashboard, etc.)
}
//+------------------------------------------------------------------+
