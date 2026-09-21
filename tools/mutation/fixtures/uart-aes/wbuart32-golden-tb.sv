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

reg cyc=0,stb=0,we=0; reg[1:0] addr=0; reg[31:0] wdata=0; wire[31:0] rdata; wire ack,stall,rx_int;
wbuart #(.INITIAL_SETUP(31'd32),.LGFLEN(4),.HARDWARE_FLOW_CONTROL_PRESENT(0)) dut(
 .i_clk(clk),.i_reset(rst),.i_wb_cyc(cyc),.i_wb_stb(stb),.i_wb_we(we),.i_wb_addr(addr),.i_wb_data(wdata),.i_wb_sel(4'hf),
 .o_wb_stall(stall),.o_wb_ack(ack),.o_wb_data(rdata),.i_uart_rx(rx),.o_uart_tx(tx),.i_cts_n(1'b0),.o_uart_rx_int(rx_int));
task automatic bus(input bit wr,input[1:0] a,input[31:0] d,output[31:0] q);
 integer n; begin
  @(negedge clk); cyc=1; stb=1; we=wr; addr=a; wdata=d;
  @(negedge clk); stb=0; n=0;
  while(!ack && n<16) begin @(negedge clk); n=n+1; end
  if(!ack || stall) $fatal(1,"WB_ACK"); q=rdata;
  @(negedge clk); cyc=0; we=0; ticks(3);
 end
endtask
integer i,n; reg[31:0] q;
initial begin
 ticks(8); rst=0; ticks(BIT_CYCLES*16);
 bus(0,0,0,q); if(q!==32'h40000020) $fatal(1,"WB_SETUP %h",q);
 for(i=0;i<8;i=i+1) begin
  bus(1,3,{24'd0,patterns[i]},q);
  send_rx(patterns[i]); n=0;
  while(!rx_int && n<BIT_CYCLES*12) begin ticks(1); n=n+1; end
  if(!rx_int) $fatal(1,"RX_TIMEOUT");
  bus(0,2,0,q);
  if(q[7:0]!==patterns[i] || q[8]!==0) $fatal(1,"RX_DATA %0d %h",i,q);
  rx_count=rx_count+1; ticks(BIT_CYCLES*4);
 end
 ticks(BIT_CYCLES*15);
 if(tx_count!=8 || rx_count!=8) $fatal(1,"UART_COUNTS");
 $display("IP_PREPARATION_PASS wbuart32 tx=8 rx=8"); $finish;
end
endmodule
