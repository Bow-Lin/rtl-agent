`timescale 1ns/1ps
module tb;
reg clk=0; always #5 clk=~clk;
initial begin #2000000; $fatal(1, "GLOBAL_TIMEOUT"); end

localparam integer BIT_CYCLES=32, STOP_BITS=1;
reg rst=1, rx=1; wire tx;
reg[7:0] patterns[0:7];
integer tx_count=0,rx_count=0,checks=0;
initial begin patterns[0]=8'h00; patterns[1]=8'hff; patterns[2]=8'h55; patterns[3]=8'haa;
 patterns[4]=8'h81; patterns[5]=8'h7e; patterns[6]=8'h13; patterns[7]=8'hc4; end
task automatic ticks(input integer n); repeat(n) @(negedge clk); endtask
task automatic send_rx(input [7:0] value);
 integer bitn;
 begin
  @(negedge clk); rx=0; ticks(BIT_CYCLES);
  for(bitn=0;bitn<8;bitn=bitn+1) begin rx=value[bitn]; ticks(BIT_CYCLES); end
  rx=1; ticks(BIT_CYCLES*STOP_BITS); ticks(BIT_CYCLES);
 end
endtask
// Independent serial decoder: do not use internal DUT shift registers as oracle.
initial begin : tx_monitor
 reg[7:0] decoded; integer bitn;
 wait(!rst);
 forever begin
  @(negedge tx); ticks(BIT_CYCLES/2);
  if(tx!==0) $fatal(1,"TX_START");
  for(bitn=0;bitn<8;bitn=bitn+1) begin ticks(BIT_CYCLES); decoded[bitn]=tx; end
  for(bitn=0;bitn<STOP_BITS;bitn=bitn+1) begin ticks(BIT_CYCLES); if(tx!==1) $fatal(1,"TX_STOP"); end
  if(tx_count>=8 || decoded!==patterns[tx_count]) $fatal(1,"TX_DATA index=%0d got=%h",tx_count,decoded);
  tx_count=tx_count+1;
 end
end

reg cyc=0,stb=0,we=0; reg[2:0] addr=0; reg[7:0] wdata=0; wire[7:0] rdata; wire ack;
uart_top dut(.wb_clk_i(clk),.wb_rst_i(rst),.wb_adr_i(addr),.wb_dat_i(wdata),.wb_dat_o(rdata),.wb_we_i(we),.wb_stb_i(stb),.wb_cyc_i(cyc),.wb_ack_o(ack),.wb_sel_i(4'h1),.srx_pad_i(rx),.stx_pad_o(tx),.cts_pad_i(1'b0),.dsr_pad_i(1'b0),.ri_pad_i(1'b0),.dcd_pad_i(1'b0));
task automatic bus(input bit wr,input[2:0] a,input[7:0] d,output[7:0] q);
 integer n; begin
  @(negedge clk); cyc=1; stb=1; we=wr; addr=a; wdata=d; n=0;
  @(negedge clk);
  while(!ack && n<16) begin @(negedge clk); n=n+1; end
  if(!ack) $fatal(1,"WB_ACK"); q=rdata;
  cyc=0; stb=0; we=0; ticks(4);
 end
endtask
integer i,n; reg[7:0] q;
initial begin
 ticks(8); rst=0; ticks(8);
 bus(1,3,8'h83,q); bus(1,0,8'h02,q); bus(1,1,8'h00,q); bus(1,3,8'h03,q);
 bus(1,2,8'h07,q); bus(1,7,8'ha5,q); bus(0,7,0,q);
 if(q!==8'ha5) $fatal(1,"SCRATCH %h",q);
 ticks(BIT_CYCLES*3);
 for(i=0;i<8;i=i+1) begin
  bus(1,0,patterns[i],q); send_rx(patterns[i]);
  n=0; q=0; while(!q[0] && n<80) begin bus(0,5,0,q); n=n+1; end
  if(!q[0]) $fatal(1,"RX_TIMEOUT");
  if(q[4:1]!==0) $fatal(1,"RX_STATUS %h",q);
  bus(0,0,0,q); if(q!==patterns[i]) $fatal(1,"RX_DATA %0d %h",i,q);
  rx_count=rx_count+1; ticks(BIT_CYCLES*4);
 end
 ticks(BIT_CYCLES*15);
 if(tx_count!=8 || rx_count!=8) $fatal(1,"UART_COUNTS");
 $display("IP_PREPARATION_PASS uart16550 tx=8 rx=8"); $finish;
end
endmodule
